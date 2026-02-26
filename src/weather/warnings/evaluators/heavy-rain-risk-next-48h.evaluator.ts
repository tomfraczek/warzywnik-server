import { Injectable } from '@nestjs/common';
import { WarningCode, WarningScope } from '../../../common/enums/warning.enums';
import { WeatherWarningConfigService } from '../weather-warning-config.service';
import {
  addHours,
  dedupeKeyFor,
  type WarningInstanceUpsertInput,
  type WeatherWarningContext,
  type WeatherWarningEvaluator,
} from '../weather-warning.types';

@Injectable()
export class HeavyRainRiskNext48hEvaluator implements WeatherWarningEvaluator {
  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const hourly = ctx.snapshotData?.hourly?.slice(0, 48) ?? [];
    if (hourly.length === 0) return [];

    const { precipSumThresholdMm48h, precipHourlyPeakThresholdMm } =
      await this.configService.getParams<{
        precipSumThresholdMm48h: number;
        precipHourlyPeakThresholdMm: number;
      }>(WarningCode.HEAVY_RAIN_RISK_NEXT_48H);

    const precipSumMm = hourly.reduce((sum, point) => sum + point.precip, 0);
    const peak = hourly.reduce((acc, point) =>
      point.precip > acc.precip ? point : acc,
    );

    if (
      peak.precip <= precipHourlyPeakThresholdMm &&
      precipSumMm <= precipSumThresholdMm48h
    ) {
      return [];
    }

    const peakDate = new Date(peak.time);

    return [
      {
        scope: WarningScope.USER,
        code: WarningCode.HEAVY_RAIN_RISK_NEXT_48H,
        values: {
          precipSumMm: Number(precipSumMm.toFixed(2)),
          thresholdMm: precipSumThresholdMm48h,
          peakHourPrecipMm: Number(peak.precip.toFixed(2)),
        },
        details: {
          peakHour: peak.time,
          peakHourPrecipMm: Number(peak.precip.toFixed(2)),
          windowHours: 48,
        },
        validFrom: ctx.now,
        validTo: Number.isNaN(peakDate.getTime())
          ? addHours(ctx.now, 48)
          : addHours(peakDate, 6),
        snapshotFetchedAt: ctx.snapshotFetchedAt,
        weatherBasis: ctx.weatherBasis,
        dedupeKey: dedupeKeyFor({
          userId: ctx.user.id,
          code: WarningCode.HEAVY_RAIN_RISK_NEXT_48H,
        }),
      },
    ];
  }
}
