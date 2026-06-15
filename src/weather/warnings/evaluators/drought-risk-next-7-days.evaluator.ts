import { Injectable } from '@nestjs/common';
import { WarningCode, WarningScope } from '../../../common/enums/warning.enums';
import { WeatherWarningConfigService } from '../weather-warning-config.service';
import {
  dedupeKeyFor,
  getLocalDate,
  localDateAndHourFromTime,
  toEndOfDay,
  type WarningInstanceUpsertInput,
  type WeatherWarningContext,
  type WeatherWarningEvaluator,
} from '../weather-warning.types';

@Injectable()
export class DroughtRiskNext7DaysEvaluator implements WeatherWarningEvaluator {
  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const daily = ctx.snapshotData?.daily?.slice(0, 7) ?? [];
    if (daily.length === 0) return [];

    const { precipSumThresholdMm7d } = await this.configService.getParams<{
      precipSumThresholdMm7d: number;
      considerTempWind?: boolean;
    }>(WarningCode.DROUGHT_RISK_NEXT_7_DAYS);

    // Compute actual today precipitation from hourly data.
    // Open-Meteo daily.precipSum for day[0] is a forecast that may undercount
    // when rain started after the forecast snapshot was taken. Hourly data for
    // hours that have already passed reflects actual measurements — use the
    // higher of the two so that a rainy day is never misread as a dry one.
    const timezone = ctx.snapshotData?.timezone ?? 'UTC';
    const todayLocalDate = daily[0]?.date ?? getLocalDate(ctx.now, timezone);
    let todayHourlyPrecipMm = 0;
    for (const point of ctx.snapshotData?.hourly ?? []) {
      const parsed = localDateAndHourFromTime(point.time, timezone);
      if (parsed?.localDate === todayLocalDate) {
        todayHourlyPrecipMm += point.precip;
      }
    }

    const precipByDay = daily.map((item, index) => ({
      date: item.date,
      // For today (index 0): prefer the higher of daily forecast and hourly sum
      // so that actual rain already measured is not understated by the forecast.
      precipSum:
        index === 0
          ? Math.max(item.precipSum, todayHourlyPrecipMm)
          : item.precipSum,
    }));
    const precipSumMm = precipByDay.reduce(
      (sum, item) => sum + item.precipSum,
      0,
    );

    if (precipSumMm >= precipSumThresholdMm7d) return [];

    const resolvedBedName =
      ctx.beds.length === 1
        ? ctx.beds[0].name
        : ctx.beds.length > 1
          ? 'Twoich grządkach'
          : 'grządce';

    return [
      {
        scope: WarningScope.USER,
        code: WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
        values: {
          bedName: resolvedBedName,
          precipSumMm: Number(precipSumMm.toFixed(2)),
          thresholdMm: precipSumThresholdMm7d,
        },
        details: {
          bedName: resolvedBedName,
          precipByDay,
          precipSumMm: Number(precipSumMm.toFixed(2)),
          thresholdMm: precipSumThresholdMm7d,
        },
        validFrom: ctx.now,
        validTo: toEndOfDay(daily[daily.length - 1].date),
        snapshotFetchedAt: ctx.snapshotFetchedAt,
        weatherBasis: ctx.weatherBasis,
        dedupeKey: dedupeKeyFor({
          userId: ctx.user.id,
          code: WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
        }),
      },
    ];
  }
}
