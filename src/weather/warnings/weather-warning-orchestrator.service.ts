import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Bed } from '../../beds/bed.entity';
import { Planting } from '../../plantings/planting.entity';
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
import { OperationalWeatherWarningsEvaluator } from './evaluators/operational-weather-warnings.evaluator';
import { GreenhouseWeatherWarningsEvaluator } from './evaluators/greenhouse-weather-warnings.evaluator';
import { ACTIVE_PLANTING_STATUSES } from '../../plantings/planting-lifecycle';
import { resolveWarningContradictions } from './weather-warning-guards';

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
    private readonly operationalWeatherWarningsEvaluator: OperationalWeatherWarningsEvaluator,
    private readonly greenhouseWeatherWarningsEvaluator: GreenhouseWeatherWarningsEvaluator,
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

    const computedAt = new Date();
    if (beds.length === 0) {
      await this.deactivateAllActiveForUser(user.id, computedAt);
      this.logger.log(
        `recomputed warning instances user=${userId} active=0 basis=${weatherBasis} (no active beds)`,
      );

      return {
        computedAt,
        weatherBasis,
        activeCount: 0,
      };
    }

    const plantings = await this.em.find(
      Planting,
      {
        user: userId,
        bed: { isActive: true },
        status: {
          $in: ACTIVE_PLANTING_STATUSES,
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
    const resolved = resolveWarningContradictions(allInputs);
    const deduped = new Map<string, WarningInstanceUpsertInput>();
    for (const input of resolved) {
      deduped.set(input.dedupeKey, input);
    }

    const desiredKeys = new Set(deduped.keys());

    await this.em.transactional(async (em) => {
      // Step 1: load currently active entities BEFORE any modifications
      // so that em.find() does not overwrite in-memory changes made below
      const currentlyActive = await em.find(WarningInstance, {
        user: user.id,
        isActive: true,
      });

      // Step 2: deactivate entities that are no longer desired
      for (const active of currentlyActive) {
        if (desiredKeys.has(active.dedupeKey)) {
          continue;
        }

        active.isActive = false;
        active.validTo = computedAt;
        active.computedAt = computedAt;
      }

      // Step 3: upsert desired entities (create or update)
      const currentlyActiveByKey = new Map(
        currentlyActive.map((e) => [e.dedupeKey, e]),
      );

      for (const input of deduped.values()) {
        let entity = currentlyActiveByKey.get(input.dedupeKey);

        if (!entity) {
          entity =
            (await em.findOne(WarningInstance, {
              user: user.id,
              dedupeKey: input.dedupeKey,
            })) ?? undefined;
        }

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
    const activeBedsCount = await this.em.count(Bed, {
      user: userId,
      isActive: true,
    });

    if (activeBedsCount === 0) {
      return [];
    }

    return this.em.find(
      WarningInstance,
      {
        user: userId,
        isActive: true,
        validTo: { $gt: now },
        $or: [
          { bed: null, planting: null },
          { bed: { isActive: true } },
          { planting: { bed: { isActive: true } } },
        ],
      },
      {
        populate: ['bed', 'planting', 'planting.bed', 'planting.vegetable'],
        orderBy: [{ computedAt: 'desc' }, { createdAt: 'desc' }],
      },
    );
  }

  private async deactivateAllActiveForUser(
    userId: string,
    computedAt: Date,
  ): Promise<void> {
    await this.em.transactional(async (em) => {
      const currentlyActive = await em.find(WarningInstance, {
        user: userId,
        isActive: true,
      });

      for (const active of currentlyActive) {
        active.isActive = false;
        active.validTo = computedAt;
        active.computedAt = computedAt;
      }

      await em.flush();
    });
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
      this.operationalWeatherWarningsEvaluator,
      this.greenhouseWeatherWarningsEvaluator,
    ];

    const result: WarningInstanceUpsertInput[] = [];

    for (const evaluator of evaluators) {
      const out = await evaluator.evaluate(ctx);
      result.push(...out);
    }

    return result;
  }
}
