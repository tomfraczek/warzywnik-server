import { Injectable } from '@nestjs/common';
import { DrainageLevel } from '../../../common/enums/soil.enums';
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
export class OverwateringRiskEvaluator implements WeatherWarningEvaluator {
  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const hourly = ctx.snapshotData?.hourly?.slice(0, 48) ?? [];
    if (hourly.length === 0 || ctx.beds.length === 0) return [];

    const { precipSumThresholdMm48h, drainageLowValues } =
      await this.configService.getParams<{
        precipSumThresholdMm48h: number;
        drainageLowValues: string[];
      }>(WarningCode.OVERWATERING_RISK);

    const precipSumMm = hourly.reduce((sum, point) => sum + point.precip, 0);
    if (precipSumMm < precipSumThresholdMm48h) return [];

    const lowDrainage = new Set(
      (drainageLowValues ?? ['poor']).map((item) => item.toLowerCase()),
    );

    return ctx.beds
      .filter((bed) => {
        const drainage = bed.soil?.drainage;
        return drainage
          ? lowDrainage.has(String(drainage).toLowerCase())
          : false;
      })
      .map((bed) => ({
        scope: WarningScope.BED,
        code: WarningCode.OVERWATERING_RISK,
        bedId: bed.id,
        values: {
          bedName: bed.name,
          precipSumMm: Number(precipSumMm.toFixed(2)),
          soilDrainage: bed.soil?.drainage ?? DrainageLevel.MEDIUM,
        },
        details: {
          bedId: bed.id,
          drainage: bed.soil?.drainage ?? null,
          precipSumMm: Number(precipSumMm.toFixed(2)),
          reason: 'HEAVY_RAIN_AND_LOW_DRAINAGE',
        },
        validFrom: ctx.now,
        validTo: addHours(ctx.now, 48),
        snapshotFetchedAt: ctx.snapshotFetchedAt,
        weatherBasis: ctx.weatherBasis,
        dedupeKey: dedupeKeyFor({
          userId: ctx.user.id,
          bedId: bed.id,
          code: WarningCode.OVERWATERING_RISK,
        }),
      }));
  }
}
