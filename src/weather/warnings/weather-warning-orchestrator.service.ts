import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Bed } from '../../beds/bed.entity';
import { Planting } from '../../plantings/planting.entity';
import { PlantingStatus } from '../../common/enums/planting.enums';
import { User } from '../../users/user.entity';
import { WeatherSnapshot } from '../weather-snapshot.entity';
import { WeatherService } from '../weather.service';
import { WarningInstance } from './warning-instance.entity';
import {
  WeatherWarningContext,
  WarningInstanceUpsertInput,
} from './weather-warning.types';
import { FrostRiskNext7DaysEvaluator } from './evaluators/frost-risk-next-7-days.evaluator';
import { HardFrostRiskNext7DaysEvaluator } from './evaluators/hard-frost-risk-next-7-days.evaluator';
import { DroughtRiskNext7DaysEvaluator } from './evaluators/drought-risk-next-7-days.evaluator';
import { HeavyRainRiskNext48hEvaluator } from './evaluators/heavy-rain-risk-next-48h.evaluator';
import { WindDamageRiskNext48hEvaluator } from './evaluators/wind-damage-risk-next-48h.evaluator';
import { FungalDiseasePressureHighEvaluator } from './evaluators/fungal-disease-pressure-high.evaluator';
import { OverwateringRiskEvaluator } from './evaluators/overwatering-risk.evaluator';
import { GerminationTooColdEvaluator } from './evaluators/germination-too-cold.evaluator';

@Injectable()
export class WeatherWarningOrchestratorService {
  private readonly logger = new Logger(WeatherWarningOrchestratorService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly weatherService: WeatherService,
    private readonly frostRiskNext7DaysEvaluator: FrostRiskNext7DaysEvaluator,
    private readonly hardFrostRiskNext7DaysEvaluator: HardFrostRiskNext7DaysEvaluator,
    private readonly droughtRiskNext7DaysEvaluator: DroughtRiskNext7DaysEvaluator,
    private readonly heavyRainRiskNext48hEvaluator: HeavyRainRiskNext48hEvaluator,
    private readonly windDamageRiskNext48hEvaluator: WindDamageRiskNext48hEvaluator,
    private readonly fungalDiseasePressureHighEvaluator: FungalDiseasePressureHighEvaluator,
    private readonly overwateringRiskEvaluator: OverwateringRiskEvaluator,
    private readonly germinationTooColdEvaluator: GerminationTooColdEvaluator,
  ) {}

  async recomputeForUser(userId: string): Promise<{
    computedAt: Date;
    weatherBasis: 'FRESH' | 'STALE' | 'NONE';
    activeCount: number;
  }> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const weatherBasis =
      await this.weatherService.tryEnsureWeatherBasis(userId);
    const snapshot = await this.em.findOne(
      WeatherSnapshot,
      { user: userId },
      { orderBy: { fetchedAt: 'desc' } },
    );

    const beds = await this.em.find(
      Bed,
      { user: userId, isActive: true },
      { populate: ['soil'] },
    );

    const plantings = await this.em.find(
      Planting,
      {
        user: userId,
        status: {
          $in: [
            PlantingStatus.PLANNED,
            PlantingStatus.ACTIVE,
            PlantingStatus.HARVESTING,
          ],
        },
      },
      { populate: ['bed', 'bed.soil', 'vegetable'] },
    );

    const context: WeatherWarningContext = {
      user,
      beds,
      plantings,
      now,
      weatherBasis,
      snapshotFetchedAt: snapshot?.fetchedAt ?? null,
      snapshotData: snapshot?.data ?? null,
    };

    const allInputs = await this.evaluateAll(context);
    const deduped = new Map<string, WarningInstanceUpsertInput>();
    for (const input of allInputs) {
      deduped.set(input.dedupeKey, input);
    }

    const desiredKeys = new Set(deduped.keys());
    const computedAt = new Date();

    await this.em.transactional(async (em) => {
      for (const input of deduped.values()) {
        let entity = await em.findOne(WarningInstance, {
          user: user.id,
          dedupeKey: input.dedupeKey,
        });

        if (!entity) {
          entity = new WarningInstance();
          entity.user = user;
          entity.dedupeKey = input.dedupeKey;
        }

        entity.scope = input.scope;
        entity.code = input.code;
        entity.bed = input.bedId ? em.getReference(Bed, input.bedId) : null;
        entity.planting = input.plantingId
          ? em.getReference(Planting, input.plantingId)
          : null;
        entity.values = input.values;
        entity.details = input.details ?? null;
        entity.computedAt = computedAt;
        entity.validFrom = input.validFrom;
        entity.validTo = input.validTo;
        entity.snapshotFetchedAt = input.snapshotFetchedAt ?? null;
        entity.weatherBasis = input.weatherBasis;
        entity.isActive = true;

        em.persist(entity);
      }

      const currentlyActive = await em.find(WarningInstance, {
        user: user.id,
        isActive: true,
      });

      for (const active of currentlyActive) {
        if (desiredKeys.has(active.dedupeKey)) {
          continue;
        }

        active.isActive = false;
        active.validTo = computedAt;
        active.computedAt = computedAt;
      }

      await em.flush();
    });

    this.logger.log(
      `recomputed warning instances user=${userId} active=${deduped.size} basis=${weatherBasis}`,
    );

    return {
      computedAt,
      weatherBasis,
      activeCount: deduped.size,
    };
  }

  async listActiveForUser(
    userId: string,
    now = new Date(),
  ): Promise<WarningInstance[]> {
    return this.em.find(
      WarningInstance,
      {
        user: userId,
        isActive: true,
        validTo: { $gt: now },
      },
      {
        populate: ['bed', 'planting', 'planting.vegetable'],
        orderBy: [{ computedAt: 'desc' }, { createdAt: 'desc' }],
      },
    );
  }

  private async evaluateAll(
    ctx: WeatherWarningContext,
  ): Promise<WarningInstanceUpsertInput[]> {
    const evaluators = [
      this.frostRiskNext7DaysEvaluator,
      this.hardFrostRiskNext7DaysEvaluator,
      this.droughtRiskNext7DaysEvaluator,
      this.heavyRainRiskNext48hEvaluator,
      this.windDamageRiskNext48hEvaluator,
      this.fungalDiseasePressureHighEvaluator,
      this.overwateringRiskEvaluator,
      this.germinationTooColdEvaluator,
    ];

    const result: WarningInstanceUpsertInput[] = [];

    for (const evaluator of evaluators) {
      const out = await evaluator.evaluate(ctx);
      result.push(...out);
    }

    return result;
  }
}
