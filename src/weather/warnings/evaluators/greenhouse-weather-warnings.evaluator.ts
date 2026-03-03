import { Injectable } from '@nestjs/common';
import { CultivationEnvironment } from '../../../common/enums/bed.enums';
import { WarningCode, WarningScope } from '../../../common/enums/warning.enums';
import { WeatherWarningConfigService } from '../weather-warning-config.service';
import {
  dedupeKeyFor,
  getLocalDate,
  localDateAndHourFromTime,
  localDatePlusDays,
  localDayBoundsUtc,
  type WarningInstanceUpsertInput,
  type WeatherWarningContext,
  type WeatherWarningEvaluator,
} from '../weather-warning.types';

type Metrics = {
  minTempC: number;
  maxTempC: number;
  nightMinTempC: number;
  dayMaxTempC: number;
  dayMaxWindKmh: number;
  dayPrecipMm: number;
  maxWindKmh: number;
  precipSumMm: number;
  peakPrecipMm: number;
  snowSumMm: number;
  wetSnowMm: number;
  stormHours: number;
};

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;

const emptyMetrics = (): Metrics => ({
  minTempC: Number.POSITIVE_INFINITY,
  maxTempC: Number.NEGATIVE_INFINITY,
  nightMinTempC: Number.POSITIVE_INFINITY,
  dayMaxTempC: Number.NEGATIVE_INFINITY,
  dayMaxWindKmh: 0,
  dayPrecipMm: 0,
  maxWindKmh: 0,
  precipSumMm: 0,
  peakPrecipMm: 0,
  snowSumMm: 0,
  wetSnowMm: 0,
  stormHours: 0,
});

@Injectable()
export class GreenhouseWeatherWarningsEvaluator
  implements WeatherWarningEvaluator
{
  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const greenhouseBeds = ctx.beds.filter((bed) =>
      [
        CultivationEnvironment.GREENHOUSE,
        CultivationEnvironment.TUNNEL,
      ].includes(bed.cultivationEnvironment),
    );

    if (greenhouseBeds.length === 0) {
      return [];
    }

    const timezone = ctx.snapshotData?.timezone ?? 'UTC';
    const todayLocalDate = getLocalDate(ctx.now, timezone);
    const tomorrowLocalDate = localDatePlusDays(todayLocalDate, 1);
    if (!tomorrowLocalDate) return [];

    const dateOrder = [todayLocalDate, tomorrowLocalDate];
    const metricsByDate = this.collectMetricsByDate(
      ctx,
      timezone,
      new Set(dateOrder),
    );

    const {
      frostThresholdC,
      hardFrostThresholdC,
      heatWaveThresholdC,
      strongWindThresholdKmh,
      heavyRainThresholdMm,
      stormWindThresholdKmh,
      stormRainThresholdMm,
      snowLoadThresholdMm,
      wetSnowThresholdMm,
      suddenTempDropThresholdC,
    } = await this.configService.getParams<{
      frostThresholdC: number;
      hardFrostThresholdC: number;
      heatWaveThresholdC: number;
      strongWindThresholdKmh: number;
      heavyRainThresholdMm: number;
      stormWindThresholdKmh: number;
      stormRainThresholdMm: number;
      snowLoadThresholdMm: number;
      wetSnowThresholdMm: number;
      suddenTempDropThresholdC: number;
    }>(WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT);

    const result: WarningInstanceUpsertInput[] = [];

    dateOrder.forEach((localDate, dayIndex) => {
      const metrics = metricsByDate.get(localDate);
      if (!metrics) return;

      const dayLabel = dayIndex === 0 ? 'Dziś' : 'Jutro';
      const bounds = localDayBoundsUtc(localDate, timezone);
      if (!bounds) return;

      greenhouseBeds.forEach((bed) => {
        const push = (
          code: WarningCode,
          values: Record<string, number | string>,
          details: Record<string, unknown>,
          dayPart?: 'DAY' | 'NIGHT',
        ) => {
          result.push({
            scope: WarningScope.BED,
            code,
            bedId: bed.id,
            values: {
              ...values,
              bedName: bed.name,
              dayLabel,
            },
            details: {
              ...details,
              bedId: bed.id,
              bedName: bed.name,
              localDate,
              dayLabel,
              dayPart: dayPart ?? 'ANY',
            },
            validFrom: bounds.start,
            validTo: bounds.end,
            snapshotFetchedAt: ctx.snapshotFetchedAt,
            weatherBasis: ctx.weatherBasis,
            dedupeKey: dedupeKeyFor({
              userId: ctx.user.id,
              code,
              bedId: bed.id,
              localDate,
              dayPart,
            }),
          });
        };

        if (Number.isFinite(metrics.nightMinTempC)) {
          if (metrics.nightMinTempC <= frostThresholdC) {
            push(
              dayIndex === 0
                ? WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT
                : WarningCode.GREENHOUSE_FROST_RISK_TOMORROW_NIGHT,
              {
                minTempC: Number(metrics.nightMinTempC.toFixed(1)),
                thresholdC: frostThresholdC,
              },
              {
                minTempC: Number(metrics.nightMinTempC.toFixed(1)),
                thresholdC: frostThresholdC,
              },
              'NIGHT',
            );
          }

          if (metrics.nightMinTempC <= hardFrostThresholdC) {
            push(
              dayIndex === 0
                ? WarningCode.GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT
                : WarningCode.GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT,
              {
                minTempC: Number(metrics.nightMinTempC.toFixed(1)),
                thresholdC: hardFrostThresholdC,
              },
              {
                minTempC: Number(metrics.nightMinTempC.toFixed(1)),
                thresholdC: hardFrostThresholdC,
              },
              'NIGHT',
            );
          }
        }

        if (metrics.dayMaxTempC >= heatWaveThresholdC) {
          push(
            dayIndex === 0
              ? WarningCode.GREENHOUSE_HEAT_WAVE_TODAY_DAY
              : WarningCode.GREENHOUSE_HEAT_WAVE_TOMORROW_DAY,
            {
              maxTempC: Number(metrics.dayMaxTempC.toFixed(1)),
              thresholdC: heatWaveThresholdC,
            },
            {
              maxTempC: Number(metrics.dayMaxTempC.toFixed(1)),
              thresholdC: heatWaveThresholdC,
            },
            'DAY',
          );
        }

        if (metrics.dayMaxWindKmh >= strongWindThresholdKmh) {
          push(
            dayIndex === 0
              ? WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY
              : WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY,
            {
              windMaxKmh: Number(metrics.dayMaxWindKmh.toFixed(1)),
              thresholdKmh: strongWindThresholdKmh,
            },
            {
              windMaxKmh: Number(metrics.dayMaxWindKmh.toFixed(1)),
              thresholdKmh: strongWindThresholdKmh,
            },
            'DAY',
          );
        }

        if (
          metrics.dayMaxWindKmh >= stormWindThresholdKmh &&
          metrics.dayPrecipMm >= stormRainThresholdMm
        ) {
          push(
            dayIndex === 0
              ? WarningCode.GREENHOUSE_STORM_TODAY_DAY
              : WarningCode.GREENHOUSE_STORM_TOMORROW_DAY,
            {
              windMaxKmh: Number(metrics.dayMaxWindKmh.toFixed(1)),
              precipSumMm: Number(metrics.dayPrecipMm.toFixed(1)),
            },
            {
              windMaxKmh: Number(metrics.dayMaxWindKmh.toFixed(1)),
              precipSumMm: Number(metrics.dayPrecipMm.toFixed(1)),
            },
            'DAY',
          );
        }

        if (metrics.dayPrecipMm >= heavyRainThresholdMm) {
          push(
            dayIndex === 0
              ? WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY
              : WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY,
            {
              precipSumMm: Number(metrics.dayPrecipMm.toFixed(1)),
              thresholdMm: heavyRainThresholdMm,
            },
            {
              precipSumMm: Number(metrics.dayPrecipMm.toFixed(1)),
              thresholdMm: heavyRainThresholdMm,
            },
            'DAY',
          );
        }

        if (metrics.snowSumMm >= snowLoadThresholdMm) {
          push(
            dayIndex === 0
              ? WarningCode.GREENHOUSE_SNOW_LOAD_TODAY
              : WarningCode.GREENHOUSE_SNOW_LOAD_TOMORROW,
            {
              snowSumMm: Number(metrics.snowSumMm.toFixed(1)),
              thresholdMm: snowLoadThresholdMm,
            },
            {
              snowSumMm: Number(metrics.snowSumMm.toFixed(1)),
              thresholdMm: snowLoadThresholdMm,
            },
          );
        }

        if (metrics.wetSnowMm >= wetSnowThresholdMm) {
          push(
            dayIndex === 0
              ? WarningCode.GREENHOUSE_WET_SNOW_TODAY
              : WarningCode.GREENHOUSE_WET_SNOW_TOMORROW,
            {
              wetSnowMm: Number(metrics.wetSnowMm.toFixed(1)),
              thresholdMm: wetSnowThresholdMm,
            },
            {
              wetSnowMm: Number(metrics.wetSnowMm.toFixed(1)),
              thresholdMm: wetSnowThresholdMm,
            },
          );
        }

        const tempDropC = metrics.maxTempC - metrics.minTempC;
        if (
          Number.isFinite(tempDropC) &&
          tempDropC >= suddenTempDropThresholdC
        ) {
          push(
            dayIndex === 0
              ? WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TODAY
              : WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW,
            {
              tempDropC: Number(tempDropC.toFixed(1)),
              thresholdC: suddenTempDropThresholdC,
            },
            {
              tempDropC: Number(tempDropC.toFixed(1)),
              thresholdC: suddenTempDropThresholdC,
            },
          );
        }
      });
    });

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
  ): Map<string, Metrics> {
    const byDate = new Map<string, Metrics>();

    for (const point of ctx.snapshotData?.hourly ?? []) {
      const parsed = localDateAndHourFromTime(point.time, timezone);
      if (!parsed || !dates.has(parsed.localDate)) {
        continue;
      }

      const dayPart =
        parsed.hour >= DAY_START_HOUR && parsed.hour < DAY_END_HOUR
          ? 'DAY'
          : 'NIGHT';

      const metrics = byDate.get(parsed.localDate) ?? emptyMetrics();
      metrics.minTempC = Math.min(metrics.minTempC, point.temp);
      metrics.maxTempC = Math.max(metrics.maxTempC, point.temp);
      metrics.maxWindKmh = Math.max(metrics.maxWindKmh, point.wind);
      metrics.precipSumMm += point.precip;
      metrics.peakPrecipMm = Math.max(metrics.peakPrecipMm, point.precip);
      metrics.snowSumMm += point.snow;
      if (point.snow > 0 && point.temp >= -1 && point.temp <= 2) {
        metrics.wetSnowMm += point.snow;
      }
      if (point.wind >= 60 && point.precip >= 3) {
        metrics.stormHours += 1;
      }

      if (dayPart === 'DAY') {
        metrics.dayPrecipMm += point.precip;
        metrics.dayMaxTempC = Math.max(metrics.dayMaxTempC, point.temp);
        metrics.dayMaxWindKmh = Math.max(metrics.dayMaxWindKmh, point.wind);
      }

      if (dayPart === 'NIGHT') {
        metrics.nightMinTempC = Math.min(metrics.nightMinTempC, point.temp);
      }

      byDate.set(parsed.localDate, metrics);
    }

    return byDate;
  }
}
