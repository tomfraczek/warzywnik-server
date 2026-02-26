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
export class FungalDiseasePressureHighEvaluator
  implements WeatherWarningEvaluator
{
  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const hourly = ctx.snapshotData?.hourly?.slice(0, 48) ?? [];
    if (hourly.length === 0) return [];

    const { precipSumThresholdMm48h, tempMinC, tempMaxC } =
      await this.configService.getParams<{
        precipSumThresholdMm48h: number;
        tempMinC: number;
        tempMaxC: number;
      }>(WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH);

    const precipSumMm = hourly.reduce((sum, point) => sum + point.precip, 0);
    const avgTempC =
      hourly.reduce((sum, point) => sum + point.temp, 0) / hourly.length;

    const precipMatches = precipSumMm >= precipSumThresholdMm48h;
    const tempMatches = avgTempC >= tempMinC && avgTempC <= tempMaxC;

    if (!precipMatches || !tempMatches) return [];

    return [
      {
        scope: WarningScope.USER,
        code: WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH,
        values: {
          precipSumMm: Number(precipSumMm.toFixed(2)),
          avgTempC: Number(avgTempC.toFixed(1)),
        },
        details: {
          tempMatches,
          precipMatches,
          precipSumMm: Number(precipSumMm.toFixed(2)),
          avgTempC: Number(avgTempC.toFixed(1)),
        },
        validFrom: ctx.now,
        validTo: addHours(ctx.now, 48),
        snapshotFetchedAt: ctx.snapshotFetchedAt,
        weatherBasis: ctx.weatherBasis,
        dedupeKey: dedupeKeyFor({
          userId: ctx.user.id,
          code: WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH,
        }),
      },
    ];
  }
}
