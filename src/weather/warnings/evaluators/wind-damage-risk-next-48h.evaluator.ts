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
export class WindDamageRiskNext48hEvaluator implements WeatherWarningEvaluator {
  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const hourly = ctx.snapshotData?.hourly?.slice(0, 48) ?? [];
    if (hourly.length === 0) return [];

    const { windMaxThresholdKmh } = await this.configService.getParams<{
      windMaxThresholdKmh: number;
    }>(WarningCode.WIND_DAMAGE_RISK_NEXT_48H);

    const peak = hourly.reduce((acc, point) =>
      point.wind > acc.wind ? point : acc,
    );

    if (peak.wind <= windMaxThresholdKmh) return [];

    const peakDate = new Date(peak.time);

    return [
      {
        scope: WarningScope.USER,
        code: WarningCode.WIND_DAMAGE_RISK_NEXT_48H,
        values: {
          windMaxKmh: Number(peak.wind.toFixed(2)),
          thresholdKmh: windMaxThresholdKmh,
        },
        details: {
          peakHour: peak.time,
          windMaxKmh: Number(peak.wind.toFixed(2)),
        },
        validFrom: ctx.now,
        validTo: Number.isNaN(peakDate.getTime())
          ? addHours(ctx.now, 48)
          : addHours(peakDate, 6),
        snapshotFetchedAt: ctx.snapshotFetchedAt,
        weatherBasis: ctx.weatherBasis,
        dedupeKey: dedupeKeyFor({
          userId: ctx.user.id,
          code: WarningCode.WIND_DAMAGE_RISK_NEXT_48H,
        }),
      },
    ];
  }
}
