import { Injectable } from '@nestjs/common';
import { WarningCode, WarningScope } from '../../../common/enums/warning.enums';
import { WeatherWarningConfigService } from '../weather-warning-config.service';
import {
  dedupeKeyFor,
  toEndOfDay,
  type WarningInstanceUpsertInput,
  type WeatherWarningContext,
  type WeatherWarningEvaluator,
} from '../weather-warning.types';

@Injectable()
export class FrostRiskNext7DaysEvaluator implements WeatherWarningEvaluator {
  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const daily = ctx.snapshotData?.daily?.slice(0, 7) ?? [];
    if (daily.length === 0) return [];

    const { tempMinThresholdC } = await this.configService.getParams<{
      tempMinThresholdC: number;
    }>(WarningCode.FROST_RISK_NEXT_7_DAYS);

    const riskDates = daily
      .filter((item) => item.tempMin <= tempMinThresholdC)
      .map((item) => item.date);

    if (riskDates.length === 0) return [];

    const minTempC = Math.min(...daily.map((item) => item.tempMin));

    return [
      {
        scope: WarningScope.USER,
        code: WarningCode.FROST_RISK_NEXT_7_DAYS,
        values: {
          thresholdC: tempMinThresholdC,
          minTempC,
          riskDate: riskDates[0],
        },
        details: { riskDates, minTempC, thresholdC: tempMinThresholdC },
        validFrom: ctx.now,
        validTo: toEndOfDay(riskDates[riskDates.length - 1]),
        snapshotFetchedAt: ctx.snapshotFetchedAt,
        weatherBasis: ctx.weatherBasis,
        dedupeKey: dedupeKeyFor({
          userId: ctx.user.id,
          code: WarningCode.FROST_RISK_NEXT_7_DAYS,
        }),
      },
    ];
  }
}
