import { Injectable } from '@nestjs/common';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../../../common/enums/planting.enums';
import { WarningCode, WarningScope } from '../../../common/enums/warning.enums';
import { WeatherWarningConfigService } from '../weather-warning-config.service';
import {
  addHours,
  dedupeKeyFor,
  type WarningInstanceUpsertInput,
  type WeatherWarningContext,
  type WeatherWarningEvaluator,
} from '../weather-warning.types';

const ACTIVE_GRACE_DAYS = 7;

@Injectable()
export class GerminationTooColdEvaluator implements WeatherWarningEvaluator {
  constructor(private readonly configService: WeatherWarningConfigService) {}

  async evaluate(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const { germinationMinTempC, windowHours } =
      await this.configService.getParams<{
        germinationMinTempC: number;
        windowHours: number;
      }>(WarningCode.GERMINATION_TOO_COLD);

    const hourly = ctx.snapshotData?.hourly?.slice(0, windowHours) ?? [];
    if (hourly.length === 0) return [];

    const forecastMins = hourly.map((point) => point.temp);
    const forecastMinTempC = Math.min(...forecastMins);

    if (forecastMinTempC >= germinationMinTempC) return [];

    return ctx.plantings
      .filter((planting) => {
        if (planting.status !== PlantingStatus.IN_GROUND) {
          return false;
        }

        const start =
          planting.startMethod === PlantingStartMethod.DIRECT_SOW
            ? (planting.sowedAt ??
              planting.actualStartDate ??
              planting.plannedStartDate)
            : (planting.transplantedAt ??
              planting.actualStartDate ??
              planting.plannedStartDate);
        if (!start) return false;
        const diffMs = ctx.now.getTime() - start.getTime();
        return diffMs <= ACTIVE_GRACE_DAYS * 24 * 60 * 60 * 1000;
      })
      .map((planting) => ({
        scope: WarningScope.PLANTING,
        code: WarningCode.GERMINATION_TOO_COLD,
        bedId: planting.bed.id,
        plantingId: planting.id,
        values: {
          bedName: planting.bed.name,
          vegetableName: planting.vegetable.name,
          minGerminationTempC: germinationMinTempC,
          forecastMinTempC: Number(forecastMinTempC.toFixed(1)),
        },
        details: {
          plantingId: planting.id,
          bedId: planting.bed.id,
          usedFallback: true,
          forecastMins,
        },
        validFrom: ctx.now,
        validTo: addHours(ctx.now, windowHours),
        snapshotFetchedAt: ctx.snapshotFetchedAt,
        weatherBasis: ctx.weatherBasis,
        dedupeKey: dedupeKeyFor({
          userId: ctx.user.id,
          plantingId: planting.id,
          code: WarningCode.GERMINATION_TOO_COLD,
        }),
      }));
  }
}
