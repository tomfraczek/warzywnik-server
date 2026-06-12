import { Injectable, Logger } from '@nestjs/common';
import { CultivationEnvironment } from '../../../common/enums/bed.enums';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../../../common/enums/planting.enums';
import { WarningCode, WarningScope } from '../../../common/enums/warning.enums';
import { WeatherWarningConfigService } from '../weather-warning-config.service';
import {
  DayPart,
  dedupeKeyFor,
  getLocalDate,
  localDateAndHourFromTime,
  localDatePlusDays,
  localDayBoundsUtc,
  type WarningInstanceUpsertInput,
  type WeatherWarningContext,
  type WeatherWarningEvaluator,
} from '../weather-warning.types';

type WindowMetrics = {
  minTempC: number;
  maxTempC: number;
  maxWindKmh: number;
  precipSumMm: number;
  peakPrecipMm: number;
};

type DateMetrics = {
  DAY: WindowMetrics;
  NIGHT: WindowMetrics;
};

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;
const ACTIVE_GERMINATION_GRACE_DAYS = 7;

const createEmptyMetrics = (): WindowMetrics => ({
  minTempC: Number.POSITIVE_INFINITY,
  maxTempC: Number.NEGATIVE_INFINITY,
  maxWindKmh: 0,
  precipSumMm: 0,
  peakPrecipMm: 0,
});

const toDayPart = (hour: number): DayPart => {
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'DAY' : 'NIGHT';
};

const normalizeBedName = (name?: string | null): string => {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return 'grządka';
  }

  return name.trim();
};

@Injectable()
export class OperationalWeatherWarningsEvaluator
  implements WeatherWarningEvaluator
{
  private readonly logger = new Logger(
    OperationalWeatherWarningsEvaluator.name,
  );

  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const timezone = ctx.snapshotData?.timezone ?? 'UTC';
    const todayLocalDate = getLocalDate(ctx.now, timezone);
    const tomorrowLocalDate = localDatePlusDays(todayLocalDate, 1);
    if (!tomorrowLocalDate) {
      return [];
    }

    const dateOrder = [todayLocalDate, tomorrowLocalDate];
    const metricsByDate = this.collectMetricsByDate(
      ctx,
      timezone,
      new Set(dateOrder),
    );

    const dailyTempMinByDate = new Map<string, number>();
    const dailyPrecipByDate = new Map<string, number>();
    for (const day of ctx.snapshotData?.daily ?? []) {
      if (typeof day.date === 'string' && typeof day.tempMin === 'number') {
        dailyTempMinByDate.set(day.date, day.tempMin);
      }
      if (typeof day.date === 'string' && typeof day.precipSum === 'number') {
        dailyPrecipByDate.set(day.date, day.precipSum);
      }
    }

    this.logger.log(
      `[DIAG] evaluate user=${ctx.user.id} tz=${timezone} todayLocalDate=${todayLocalDate} tomorrowLocalDate=${tomorrowLocalDate}`,
    );
    this.logger.log(
      `[DIAG] daily dates from snapshot: ${(ctx.snapshotData?.daily ?? []).map((d) => d.date).join(', ') || 'NONE'}`,
    );
    this.logger.log(
      `[DIAG] dailyTempMinByDate today=${dailyTempMinByDate.get(todayLocalDate) ?? 'MISSING'} tomorrow=${dailyTempMinByDate.get(tomorrowLocalDate) ?? 'MISSING'}`,
    );
    this.logger.debug(
      `evaluate user=${ctx.user.id} tz=${timezone} dateOrder=${dateOrder.join(',')} hourly=${ctx.snapshotData?.hourly?.length ?? 0} metricsDays=${Array.from(metricsByDate.keys()).join(',')}`,
    );

    const outdoorBeds = ctx.beds.filter((bed) =>
      [
        CultivationEnvironment.GROUND_OUTDOOR,
        CultivationEnvironment.RAISED_BED_OUTDOOR,
        CultivationEnvironment.POT_OUTDOOR,
      ].includes(bed.cultivationEnvironment),
    );

    const lowDrainageBeds = outdoorBeds.filter((bed) => {
      const drainage = bed.soil?.drainage;
      return typeof drainage === 'string' && drainage.toLowerCase() === 'poor';
    });

    const supportedPlantings = ctx.plantings.filter((planting) =>
      [
        CultivationEnvironment.GROUND_OUTDOOR,
        CultivationEnvironment.RAISED_BED_OUTDOOR,
        CultivationEnvironment.POT_OUTDOOR,
      ].includes(planting.bed.cultivationEnvironment),
    );

    if (
      outdoorBeds.length === 0 &&
      lowDrainageBeds.length === 0 &&
      supportedPlantings.length === 0
    ) {
      return [];
    }

    const result: WarningInstanceUpsertInput[] = [];
    const generatedByDay: Record<'today' | 'tomorrow', number> = {
      today: 0,
      tomorrow: 0,
    };

    const {
      frostThresholdC,
      hardFrostThresholdC,
      heavyRainWindowThresholdMm,
      heavyRainPeakThresholdMm,
      windThresholdKmh,
      wateringDailyPrecipMaxMm,
      wateringHighTempC,
      wateringHighWindKmh,
      overwateringPrecipMm,
      germinationMinTempC,
    } = await this.configService.getParams<{
      frostThresholdC: number;
      hardFrostThresholdC: number;
      heavyRainWindowThresholdMm: number;
      heavyRainPeakThresholdMm: number;
      windThresholdKmh: number;
      wateringDailyPrecipMaxMm: number;
      wateringHighTempC: number;
      wateringHighWindKmh: number;
      overwateringPrecipMm: number;
      germinationMinTempC: number;
    }>(WarningCode.FROST_RISK_TODAY_NIGHT);

    dateOrder.forEach((localDate, dayIndex) => {
      const beforeCount = result.length;
      const dayMetrics = metricsByDate.get(localDate);
      if (!dayMetrics) {
        this.logger.debug(
          `no metrics for user=${ctx.user.id} localDate=${localDate} day=${dayIndex === 0 ? 'today' : 'tomorrow'}`,
        );
        return;
      }

      const dayLabel = dayIndex === 0 ? 'Dziś' : 'Jutro';
      const bounds = localDayBoundsUtc(localDate, timezone);
      if (!bounds) return;

      const affectedBeds = outdoorBeds.map((bed) => ({
        bedId: bed.id,
        bedName: normalizeBedName(bed.name),
      }));

      const nightMin =
        dailyTempMinByDate.get(localDate) ?? Number.POSITIVE_INFINITY;
      const nightValid = Number.isFinite(nightMin);

      if (nightValid && nightMin <= frostThresholdC && outdoorBeds.length > 0) {
        result.push({
          scope: WarningScope.USER,
          code:
            dayIndex === 0
              ? WarningCode.FROST_RISK_TODAY_NIGHT
              : WarningCode.FROST_RISK_TOMORROW_NIGHT,
          values: {
            dayLabel,
            dayPartLabel: 'w nocy',
            minTempC: Number(nightMin.toFixed(1)),
            thresholdC: frostThresholdC,
          },
          details: {
            localDate,
            dayPart: 'NIGHT',
            dayLabel,
            minTempC: Number(nightMin.toFixed(1)),
            thresholdC: frostThresholdC,
            affectedBeds,
            affectedBedsCount: affectedBeds.length,
          },
          validFrom: bounds.start,
          validTo: bounds.end,
          snapshotFetchedAt: ctx.snapshotFetchedAt,
          weatherBasis: ctx.weatherBasis,
          dedupeKey: dedupeKeyFor({
            userId: ctx.user.id,
            code:
              dayIndex === 0
                ? WarningCode.FROST_RISK_TODAY_NIGHT
                : WarningCode.FROST_RISK_TOMORROW_NIGHT,
            localDate,
            dayPart: 'NIGHT',
          }),
        });
      }

      if (
        nightValid &&
        nightMin <= hardFrostThresholdC &&
        outdoorBeds.length > 0
      ) {
        result.push({
          scope: WarningScope.USER,
          code:
            dayIndex === 0
              ? WarningCode.HARD_FROST_RISK_TODAY_NIGHT
              : WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
          values: {
            dayLabel,
            dayPartLabel: 'w nocy',
            minTempC: Number(nightMin.toFixed(1)),
            thresholdC: hardFrostThresholdC,
          },
          details: {
            localDate,
            dayPart: 'NIGHT',
            dayLabel,
            minTempC: Number(nightMin.toFixed(1)),
            thresholdC: hardFrostThresholdC,
            affectedBeds,
            affectedBedsCount: affectedBeds.length,
          },
          validFrom: bounds.start,
          validTo: bounds.end,
          snapshotFetchedAt: ctx.snapshotFetchedAt,
          weatherBasis: ctx.weatherBasis,
          dedupeKey: dedupeKeyFor({
            userId: ctx.user.id,
            code:
              dayIndex === 0
                ? WarningCode.HARD_FROST_RISK_TODAY_NIGHT
                : WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
            localDate,
            dayPart: 'NIGHT',
          }),
        });
      }

      // Track whether hourly data already produced any HEAVY_RAIN warning for
      // this date. Used below to decide whether to apply the daily fallback.
      let heavyRainEmittedFromHourly = false;

      (['DAY', 'NIGHT'] as const).forEach((dayPart) => {
        const metrics = dayMetrics[dayPart];
        const rainCode =
          dayIndex === 0
            ? dayPart === 'DAY'
              ? WarningCode.HEAVY_RAIN_TODAY_DAY
              : WarningCode.HEAVY_RAIN_TODAY_NIGHT
            : dayPart === 'DAY'
              ? WarningCode.HEAVY_RAIN_TOMORROW_DAY
              : WarningCode.HEAVY_RAIN_TOMORROW_NIGHT;

        const windCode =
          dayIndex === 0
            ? dayPart === 'DAY'
              ? WarningCode.WIND_DAMAGE_TODAY_DAY
              : WarningCode.WIND_DAMAGE_TODAY_NIGHT
            : dayPart === 'DAY'
              ? WarningCode.WIND_DAMAGE_TOMORROW_DAY
              : WarningCode.WIND_DAMAGE_TOMORROW_NIGHT;

        if (
          outdoorBeds.length > 0 &&
          (metrics.precipSumMm >= heavyRainWindowThresholdMm ||
            metrics.peakPrecipMm >= heavyRainPeakThresholdMm)
        ) {
          heavyRainEmittedFromHourly = true;
          result.push({
            scope: WarningScope.USER,
            code: rainCode,
            values: {
              dayLabel,
              dayPartLabel: dayPart === 'DAY' ? 'w dzień' : 'w nocy',
              precipSumMm: Number(metrics.precipSumMm.toFixed(2)),
              thresholdMm: heavyRainWindowThresholdMm,
            },
            details: {
              localDate,
              dayPart,
              dayLabel,
              precipSumMm: Number(metrics.precipSumMm.toFixed(2)),
              peakPrecipMm: Number(metrics.peakPrecipMm.toFixed(2)),
              thresholdMm: heavyRainWindowThresholdMm,
              affectedBeds,
              affectedBedsCount: affectedBeds.length,
            },
            validFrom: bounds.start,
            validTo: bounds.end,
            snapshotFetchedAt: ctx.snapshotFetchedAt,
            weatherBasis: ctx.weatherBasis,
            dedupeKey: dedupeKeyFor({
              userId: ctx.user.id,
              code: rainCode,
              localDate,
              dayPart,
            }),
          });
        }

        if (outdoorBeds.length > 0 && metrics.maxWindKmh >= windThresholdKmh) {
          result.push({
            scope: WarningScope.USER,
            code: windCode,
            values: {
              dayLabel,
              dayPartLabel: dayPart === 'DAY' ? 'w dzień' : 'w nocy',
              windMaxKmh: Number(metrics.maxWindKmh.toFixed(1)),
              thresholdKmh: windThresholdKmh,
            },
            details: {
              localDate,
              dayPart,
              dayLabel,
              windMaxKmh: Number(metrics.maxWindKmh.toFixed(1)),
              thresholdKmh: windThresholdKmh,
              affectedBeds,
              affectedBedsCount: affectedBeds.length,
            },
            validFrom: bounds.start,
            validTo: bounds.end,
            snapshotFetchedAt: ctx.snapshotFetchedAt,
            weatherBasis: ctx.weatherBasis,
            dedupeKey: dedupeKeyFor({
              userId: ctx.user.id,
              code: windCode,
              localDate,
              dayPart,
            }),
          });
        }
      });

      const hourlyPrecipMm =
        dayMetrics.DAY.precipSumMm + dayMetrics.NIGHT.precipSumMm;
      // Prefer daily precipSum as the authoritative source: Open-Meteo's daily
      // precipitation_sum is always fully populated, while hourly precipitation
      // can contain null values silently converted to 0, causing undercount.
      // Use the higher of the two values to avoid false watering recommendations
      // when hourly data is incomplete.
      const dailyPrecipMm = dailyPrecipByDate.get(localDate) ?? 0;
      const totalPrecipMm = Math.max(hourlyPrecipMm, dailyPrecipMm);

      // Diagnostic: log when daily and hourly precipitation diverge significantly.
      // A large gap indicates incomplete hourly data (null→0 conversion) from Open-Meteo.
      const precipDivergenceMm = dailyPrecipMm - hourlyPrecipMm;
      if (precipDivergenceMm > 5) {
        this.logger.warn(
          `[DIAG] precip divergence user=${ctx.user.id} localDate=${localDate} ` +
            `hourlySum=${hourlyPrecipMm.toFixed(2)} dailySum=${dailyPrecipMm.toFixed(2)} ` +
            `diff=${precipDivergenceMm.toFixed(2)} — hourly data may be incomplete (null→0)`,
        );
      }

      // Daily fallback for HEAVY_RAIN: when hourly data is incomplete (null→0) but
      // daily.precipSum exceeds the heavy-rain threshold, emit a single all-day warning.
      // We cannot reliably split the daily total into DAY/NIGHT without hourly data, so
      // we use the _DAY variant with dayPartLabel='w ciągu dnia' as a conservative signal.
      // The dedupeKey matches the regular _DAY key so that if hourly data later becomes
      // available and produces its own _DAY warning, the record is simply updated.
      if (
        outdoorBeds.length > 0 &&
        !heavyRainEmittedFromHourly &&
        dailyPrecipMm >= heavyRainWindowThresholdMm
      ) {
        const fallbackRainCode =
          dayIndex === 0
            ? WarningCode.HEAVY_RAIN_TODAY_DAY
            : WarningCode.HEAVY_RAIN_TOMORROW_DAY;

        result.push({
          scope: WarningScope.USER,
          code: fallbackRainCode,
          values: {
            dayLabel,
            dayPartLabel: 'w ciągu dnia',
            precipSumMm: Number(dailyPrecipMm.toFixed(2)),
            thresholdMm: heavyRainWindowThresholdMm,
          },
          details: {
            localDate,
            dayPart: 'DAY',
            dayLabel,
            precipSumMm: Number(dailyPrecipMm.toFixed(2)),
            peakPrecipMm: 0,
            thresholdMm: heavyRainWindowThresholdMm,
            affectedBeds,
            affectedBedsCount: affectedBeds.length,
            dailyFallback: true,
          },
          validFrom: bounds.start,
          validTo: bounds.end,
          snapshotFetchedAt: ctx.snapshotFetchedAt,
          weatherBasis: ctx.weatherBasis,
          dedupeKey: dedupeKeyFor({
            userId: ctx.user.id,
            code: fallbackRainCode,
            localDate,
            dayPart: 'DAY',
          }),
        });
      }

      const maxTempC = Math.max(
        dayMetrics.DAY.maxTempC,
        dayMetrics.NIGHT.maxTempC,
      );
      const maxWindKmh = Math.max(
        dayMetrics.DAY.maxWindKmh,
        dayMetrics.NIGHT.maxWindKmh,
      );

      this.logger.debug(
        `metrics user=${ctx.user.id} localDate=${localDate} day=${dayIndex === 0 ? 'today' : 'tomorrow'} nightMin=${nightValid ? nightMin.toFixed(1) : 'NA'} dayPrecip=${dayMetrics.DAY.precipSumMm.toFixed(2)} nightPrecip=${dayMetrics.NIGHT.precipSumMm.toFixed(2)} dayWindMax=${dayMetrics.DAY.maxWindKmh.toFixed(1)} nightWindMax=${dayMetrics.NIGHT.maxWindKmh.toFixed(1)} hourlyPrecip=${hourlyPrecipMm.toFixed(2)} dailyPrecip=${dailyPrecipMm.toFixed(2)} totalPrecip=${totalPrecipMm.toFixed(2)} maxTemp=${Number.isFinite(maxTempC) ? maxTempC.toFixed(1) : 'NA'} maxWind=${maxWindKmh.toFixed(1)}`,
      );

      if (
        outdoorBeds.length > 0 &&
        totalPrecipMm <= wateringDailyPrecipMaxMm &&
        (maxTempC >= wateringHighTempC || maxWindKmh >= wateringHighWindKmh)
      ) {
        const code =
          dayIndex === 0
            ? WarningCode.WATERING_NEEDED_TODAY
            : WarningCode.WATERING_NEEDED_TOMORROW;

        const vegetables = supportedPlantings
          .map((planting) => {
            const waterDemand =
              maxTempC >= wateringHighTempC + 4 ||
              maxWindKmh >= wateringHighWindKmh + 8
                ? 'high'
                : 'medium';

            return {
              plantingId: planting.id,
              vegetableName: planting.vegetable.name,
              bedId: planting.bed.id,
              bedName: normalizeBedName(planting.bed.name),
              waterDemand,
            };
          })
          .sort((a, b) =>
            a.waterDemand === b.waterDemand
              ? a.vegetableName.localeCompare(b.vegetableName)
              : a.waterDemand === 'high'
                ? -1
                : 1,
          );

        result.push({
          scope: WarningScope.USER,
          code,
          values: {
            dayLabel,
            precipSumMm: Number(totalPrecipMm.toFixed(2)),
            thresholdMm: wateringDailyPrecipMaxMm,
          },
          details: {
            localDate,
            dayPart: 'ANY',
            dayLabel,
            precipSumMm: Number(totalPrecipMm.toFixed(2)),
            thresholdMm: wateringDailyPrecipMaxMm,
            maxTempC: Number(maxTempC.toFixed(1)),
            maxWindKmh: Number(maxWindKmh.toFixed(1)),
            affectedBeds,
            affectedBedsCount: affectedBeds.length,
            vegetablesToWater: vegetables,
          },
          validFrom: bounds.start,
          validTo: bounds.end,
          snapshotFetchedAt: ctx.snapshotFetchedAt,
          weatherBasis: ctx.weatherBasis,
          dedupeKey: dedupeKeyFor({
            userId: ctx.user.id,
            code,
            localDate,
          }),
        });
      }

      if (totalPrecipMm >= overwateringPrecipMm) {
        const prepareCode =
          dayIndex === 0
            ? WarningCode.OVERWATERING_PREPARE_TODAY
            : WarningCode.OVERWATERING_PREPARE_TOMORROW;
        const checkCode =
          dayIndex === 0
            ? WarningCode.OVERWATERING_CHECK_TODAY
            : WarningCode.OVERWATERING_CHECK_TOMORROW;

        lowDrainageBeds.forEach((bed) => {
          const baseValues = {
            dayLabel,
            bedName: normalizeBedName(bed.name),
            precipSumMm: Number(totalPrecipMm.toFixed(2)),
            thresholdMm: overwateringPrecipMm,
          };

          result.push({
            scope: WarningScope.BED,
            code: prepareCode,
            bedId: bed.id,
            values: baseValues,
            details: {
              localDate,
              dayPart: 'ANY',
              dayLabel,
              bedId: bed.id,
              bedName: normalizeBedName(bed.name),
              precipSumMm: Number(totalPrecipMm.toFixed(2)),
              thresholdMm: overwateringPrecipMm,
              phase: 'prepare',
            },
            validFrom: bounds.start,
            validTo: bounds.end,
            snapshotFetchedAt: ctx.snapshotFetchedAt,
            weatherBasis: ctx.weatherBasis,
            dedupeKey: dedupeKeyFor({
              userId: ctx.user.id,
              code: prepareCode,
              bedId: bed.id,
              localDate,
            }),
          });

          result.push({
            scope: WarningScope.BED,
            code: checkCode,
            bedId: bed.id,
            values: baseValues,
            details: {
              localDate,
              dayPart: 'ANY',
              dayLabel,
              bedId: bed.id,
              bedName: normalizeBedName(bed.name),
              precipSumMm: Number(totalPrecipMm.toFixed(2)),
              thresholdMm: overwateringPrecipMm,
              phase: 'check',
            },
            validFrom: bounds.start,
            validTo: bounds.end,
            snapshotFetchedAt: ctx.snapshotFetchedAt,
            weatherBasis: ctx.weatherBasis,
            dedupeKey: dedupeKeyFor({
              userId: ctx.user.id,
              code: checkCode,
              bedId: bed.id,
              localDate,
            }),
          });
        });
      }

      const riskyNightTempC =
        dailyTempMinByDate.get(localDate) ?? Number.POSITIVE_INFINITY;
      if (
        Number.isFinite(riskyNightTempC) &&
        riskyNightTempC < germinationMinTempC
      ) {
        supportedPlantings.forEach((planting) => {
          if (planting.status !== PlantingStatus.IN_GROUND) {
            return;
          }

          const plantingStart =
            planting.startMethod === PlantingStartMethod.DIRECT_SOW
              ? (planting.sowedAt ??
                planting.actualStartDate ??
                planting.plannedStartDate)
              : (planting.transplantedAt ??
                planting.actualStartDate ??
                planting.plannedStartDate);
          if (!plantingStart) {
            return;
          }

          const ageDays =
            (ctx.now.getTime() - plantingStart.getTime()) /
            (24 * 60 * 60 * 1000);
          if (ageDays > ACTIVE_GERMINATION_GRACE_DAYS) {
            return;
          }

          const code =
            dayIndex === 0
              ? WarningCode.GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT
              : WarningCode.GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT;

          result.push({
            scope: WarningScope.PLANTING,
            code,
            bedId: planting.bed.id,
            plantingId: planting.id,
            values: {
              dayLabel,
              dayPartLabel: 'w nocy',
              bedName: normalizeBedName(planting.bed.name),
              vegetableName: planting.vegetable.name,
              minTempC: Number(riskyNightTempC.toFixed(1)),
              thresholdC: germinationMinTempC,
            },
            details: {
              localDate,
              dayPart: 'NIGHT',
              dayLabel,
              plantingState: PlantingStatus.IN_GROUND,
              usedFallback: true,
              bedId: planting.bed.id,
              bedName: normalizeBedName(planting.bed.name),
              plantingId: planting.id,
              vegetableName: planting.vegetable.name,
              minTempC: Number(riskyNightTempC.toFixed(1)),
              thresholdC: germinationMinTempC,
            },
            validFrom: bounds.start,
            validTo: bounds.end,
            snapshotFetchedAt: ctx.snapshotFetchedAt,
            weatherBasis: ctx.weatherBasis,
            dedupeKey: dedupeKeyFor({
              userId: ctx.user.id,
              code,
              plantingId: planting.id,
              localDate,
              dayPart: 'NIGHT',
            }),
          });
        });
      }

      const produced = result.length - beforeCount;
      if (produced > 0) {
        generatedByDay[dayIndex === 0 ? 'today' : 'tomorrow'] += produced;
        const pushed = result.slice(beforeCount).map((r) => r.code);
        this.logger.log(
          `[DIAG] pushed ${produced} warning(s) for ${dayIndex === 0 ? 'today' : 'tomorrow'} (${localDate}): ${pushed.join(', ')}`,
        );
      } else {
        this.logger.log(
          `[DIAG] no warnings pushed for ${dayIndex === 0 ? 'today' : 'tomorrow'} (${localDate}) nightMin=${nightValid ? nightMin.toFixed(1) : 'INVALID'} frostThreshold=${frostThresholdC} hardFrostThreshold=${hardFrostThresholdC} germinationMin=${germinationMinTempC} outdoorBeds=${outdoorBeds.length} supportedPlantings=${supportedPlantings.length}`,
        );
      }
    });

    this.logger.debug(
      `warnings summary user=${ctx.user.id} today=${generatedByDay.today} tomorrow=${generatedByDay.tomorrow}`,
    );

    return result.map((item) => ({
      ...item,
      details: {
        timezone,
        ...(item.details ?? {}),
      },
    }));
  }

  private collectMetricsByDate(
    ctx: WeatherWarningContext,
    timezone: string,
    dates: Set<string>,
  ): Map<string, DateMetrics> {
    const result = new Map<string, DateMetrics>();
    const hourly = ctx.snapshotData?.hourly ?? [];

    for (const point of hourly) {
      const parsed = localDateAndHourFromTime(point.time, timezone);
      if (!parsed || !dates.has(parsed.localDate)) {
        continue;
      }

      const dayPart = toDayPart(parsed.hour);
      const byDate =
        result.get(parsed.localDate) ??
        ({
          DAY: createEmptyMetrics(),
          NIGHT: createEmptyMetrics(),
        } as DateMetrics);

      const metrics = byDate[dayPart];
      metrics.minTempC = Math.min(metrics.minTempC, point.temp);
      metrics.maxTempC = Math.max(metrics.maxTempC, point.temp);
      metrics.maxWindKmh = Math.max(metrics.maxWindKmh, point.wind);
      metrics.precipSumMm += point.precip;
      metrics.peakPrecipMm = Math.max(metrics.peakPrecipMm, point.precip);

      result.set(parsed.localDate, byDate);
    }

    return result;
  }
}
