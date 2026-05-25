import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActionTaskOwnerScopeType,
  ActionTaskSource,
  ActionTaskSourceType,
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../../common/enums/action.enums';
import { WarningCode } from '../../common/enums/warning.enums';
import { User } from '../../users/user.entity';
import { ActionTask } from '../../action-tasks/action-task.entity';
import { WarningInstance } from './warning-instance.entity';
import { Bed } from '../../beds/bed.entity';
import { Planting } from '../../plantings/planting.entity';
import { getLocalDate, localDatePlusDays } from './weather-warning.types';
import { PlantingEvent } from '../../planting-insights/planting-event.entity';
import { PlantingEventType } from '../../common/enums/planting-event.enums';
import { NotificationEventService } from '../../notifications/notification-event.service';

type TaskProposal = {
  dedupeKey: string;
  decisionType:
    | 'WATERING'
    | 'MOISTURE_CHECK'
    | 'FROST_PROTECTION'
    | 'GENERAL_MONITORING';
  title: string;
  description?: string | null;
  dueAt: Date;
  targetType: ActionTaskTargetType;
  ownerScopeType: ActionTaskOwnerScopeType;
  ownerScopeId: string;
  bedId?: string | null;
  plantingId?: string | null;
  affectedPlantingIds?: string[];
  metadata?: Record<string, unknown>;
};

const OPERATIONAL_TASK_CODES = new Set<WarningCode>([
  WarningCode.FROST_RISK_TODAY_NIGHT,
  WarningCode.FROST_RISK_TOMORROW_NIGHT,
  WarningCode.HARD_FROST_RISK_TODAY_NIGHT,
  WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
  WarningCode.HEAVY_RAIN_TODAY_DAY,
  WarningCode.HEAVY_RAIN_TODAY_NIGHT,
  WarningCode.HEAVY_RAIN_TOMORROW_DAY,
  WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
  WarningCode.WIND_DAMAGE_TODAY_DAY,
  WarningCode.WIND_DAMAGE_TODAY_NIGHT,
  WarningCode.WIND_DAMAGE_TOMORROW_DAY,
  WarningCode.WIND_DAMAGE_TOMORROW_NIGHT,
  WarningCode.WATERING_NEEDED_TODAY,
  WarningCode.WATERING_NEEDED_TOMORROW,
  // SOWING_PAUSE_TOO_COLD_TODAY/TOMORROW intentionally excluded — these are blocking: true warnings;
  // they should surface as alerts/blockers, not generate action tasks.
  WarningCode.GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT,
  WarningCode.GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT,
  WarningCode.OVERWATERING_PREPARE_TODAY,
  WarningCode.OVERWATERING_PREPARE_TOMORROW,
  WarningCode.OVERWATERING_CHECK_TODAY,
  WarningCode.OVERWATERING_CHECK_TOMORROW,
  // GREENHOUSE_* codes intentionally excluded — these are SPACE-level warnings that require
  // WarningInstance.growingSpace association to produce a correct ownerScopeType=SPACE task.
  // Until that FK exists, creating a BED task for a SPACE warning would produce wrong ownership.
  // Greenhouse warnings surface as alerts/informational entries only.
  // TODO: re-enable with ownerScopeType=SPACE once WarningInstance.growingSpace FK is wired.
]);

@Injectable()
export class WeatherTaskPlannerService {
  private readonly logger = new Logger(WeatherTaskPlannerService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notificationEventService: NotificationEventService,
  ) {}

  async recomputeWeatherTasksForUser(userId: string): Promise<void> {
    const em = this.em.fork();
    const user = await em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.automaticTasksEnabled === false) {
      this.logger.log(
        `skip weather task recompute user=${userId} automaticTasksEnabled=false`,
      );
      return;
    }

    const now = new Date();
    const warnings = await em.find(
      WarningInstance,
      {
        user: userId,
        isActive: true,
        validTo: { $gt: now },
      },
      { populate: ['bed', 'planting', 'planting.vegetable'] },
    );

    const proposalsDraft = this.buildProposalsFromWarnings(
      warnings,
      now,
      userId,
    );
    const recentCompletedEvents = await em.find(PlantingEvent, {
      userId,
      eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
      eventTime: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    });
    const recentlyCanceledWeatherTasks = await em.find(ActionTask, {
      user: userId,
      source: ActionTaskSource.WEATHER_WARNING,
      status: ActionTaskStatus.CANCELED,
      updatedAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    });

    const proposals = this.filterProposalsByHistory(
      proposalsDraft,
      recentCompletedEvents,
      recentlyCanceledWeatherTasks,
      now,
    );

    this.logger.debug(
      `planner db-fetch user=${userId} total=${warnings.length} codes=${warnings
        .map((w) => {
          const localDate =
            typeof w.details?.localDate === 'string'
              ? w.details.localDate
              : 'unknown';
          const validTo =
            w.validTo instanceof Date
              ? w.validTo.toISOString()
              : String(w.validTo);
          return `${w.code}@${localDate}(validTo=${validTo})`;
        })
        .join(', ')}`,
    );
    const proposalByKey = new Map(
      proposals.map((item) => [item.dedupeKey, item]),
    );

    const createdTasksBuffer: ActionTask[] = [];

    await em.transactional(async (txEm) => {
      const connection = (
        txEm as unknown as {
          getConnection?: () => {
            execute: (sql: string, params?: unknown[]) => Promise<unknown>;
          };
        }
      ).getConnection?.();

      if (connection) {
        await connection.execute('select pg_advisory_xact_lock(hashtext(?))', [
          `weather-task-planner:${userId}`,
        ]);
      }

      const existing = await txEm.find(ActionTask, {
        user: userId,
        source: ActionTaskSource.WEATHER_WARNING,
        status: ActionTaskStatus.PENDING,
        dedupeKey: { $ne: null },
      });

      const existingByKey = new Map(
        existing
          .filter((item) => item.dedupeKey)
          .map((item) => [item.dedupeKey as string, item]),
      );

      for (const proposal of proposals) {
        const current = existingByKey.get(proposal.dedupeKey);
        if (current) {
          current.title = proposal.title;
          current.description = proposal.description ?? null;
          current.dueAt = proposal.dueAt;
          current.targetType = proposal.targetType;
          current.ownerScopeType = proposal.ownerScopeType;
          current.ownerScopeId = proposal.ownerScopeId;
          current.bed = proposal.bedId
            ? txEm.getReference(Bed, proposal.bedId)
            : null;
          current.planting = proposal.plantingId
            ? txEm.getReference(Planting, proposal.plantingId)
            : null;
          current.growingSpace = null;
          current.metadata = {
            ...(proposal.metadata ?? {}),
            decisionType: proposal.decisionType,
            actionKind: proposal.decisionType,
            sourceKey: proposal.dedupeKey,
            affectedPlantingIds: proposal.affectedPlantingIds ?? [],
          };
          continue;
        }

        const task = new ActionTask();
        task.user = user;
        task.status = ActionTaskStatus.PENDING;
        task.source = ActionTaskSource.WEATHER_WARNING;
        task.sourceType = ActionTaskSourceType.AUTOMATION;
        task.title = proposal.title;
        task.description = proposal.description ?? null;
        task.dueAt = proposal.dueAt;
        task.targetType = proposal.targetType;
        task.ownerScopeType = proposal.ownerScopeType;
        task.ownerScopeId = proposal.ownerScopeId;
        task.dedupeKey = proposal.dedupeKey;
        task.metadata = {
          ...(proposal.metadata ?? {}),
          decisionType: proposal.decisionType,
          actionKind: proposal.decisionType,
          sourceKey: proposal.dedupeKey,
          affectedPlantingIds: proposal.affectedPlantingIds ?? [],
        };
        task.isManuallyRescheduled = false;
        task.generatedAt = now;
        task.growingSpace = null;

        if (proposal.bedId) {
          task.bed = txEm.getReference(Bed, proposal.bedId);
        }

        if (proposal.plantingId) {
          task.planting = txEm.getReference(Planting, proposal.plantingId);
        }

        txEm.persist(task);
        createdTasksBuffer.push(task);
      }

      for (const task of existing) {
        if (!task.dedupeKey) continue;
        if (proposalByKey.has(task.dedupeKey)) continue;
        task.status = ActionTaskStatus.CANCELED;
      }

      await txEm.flush();
    });

    const createdTaskIds = createdTasksBuffer
      .map((item) => item.id)
      .filter((id): id is string => typeof id === 'string');

    if (createdTaskIds.length > 0) {
      const createdTasks = await em.find(
        ActionTask,
        { id: { $in: createdTaskIds } },
        { populate: ['bed', 'planting'] },
      );

      await this.notificationEventService.publishTaskEvents({
        userId,
        tasks: createdTasks,
        source: 'weather-task-planner',
      });
    }

    this.logger.log(
      `recomputed weather tasks user=${userId} proposals=${proposals.length}`,
    );
  }

  private buildProposalsFromWarnings(
    warnings: WarningInstance[],
    now: Date,
    userId: string,
  ): TaskProposal[] {
    const proposals = new Map<string, TaskProposal>();
    let skippedUnsupportedCode = 0;
    let skippedMissingLocalDate = 0;
    let skippedOutsideTodayTomorrow = 0;

    for (const warning of warnings) {
      if (!OPERATIONAL_TASK_CODES.has(warning.code)) {
        skippedUnsupportedCode += 1;
        continue;
      }

      const localDate = this.resolveLocalDate(warning);
      if (!localDate) {
        skippedMissingLocalDate += 1;
        continue;
      }

      if (!this.isTodayOrTomorrow(localDate, warning, now)) {
        skippedOutsideTodayTomorrow += 1;
        continue;
      }

      const dedupeKeyOld = this.buildDedupeKey({
        code: warning.code,
        userId,
        localDate,
        bedId: warning.bed?.id ?? null,
        plantingId: warning.planting?.id ?? null,
      });
      // dedupeKeyOld is kept here as unused legacy – the actual dedupeKey is computed below after scope resolution
      void dedupeKeyOld;

      this.logger.debug(
        `warning code=${warning.code} localDate=${localDate} bedId=${warning.bed?.id ?? null} plantingId=${warning.planting?.id ?? null}`,
      );

      const baseMetadata = {
        localDate,
        ...(warning.details ?? {}),
      };

      // Resolve ownership: prefer bed-level for weather tasks that logically affect a bed
      // For watering specifically, always use BED scope if a bed is known
      const resolvedBedId = warning.bed?.id ?? null;
      const resolvedPlantingId = warning.planting?.id ?? null;

      const isWateringCode =
        warning.code === WarningCode.WATERING_NEEDED_TODAY ||
        warning.code === WarningCode.WATERING_NEEDED_TOMORROW;

      // Determine scope: watering and overwatering are always bed-level when bed is known
      const isBedLevelCode =
        isWateringCode ||
        warning.code === WarningCode.OVERWATERING_PREPARE_TODAY ||
        warning.code === WarningCode.OVERWATERING_PREPARE_TOMORROW ||
        warning.code === WarningCode.OVERWATERING_CHECK_TODAY ||
        warning.code === WarningCode.OVERWATERING_CHECK_TOMORROW;

      // GREENHOUSE codes are SPACE-level operations (ventilation, snow load, heat management)
      // Note: full SPACE scope requires WarningInstance.growingSpace association;
      // until that is added, we fall back to BED scope if a bed is available.
      const isGreenHouseCode =
        warning.code === WarningCode.GREENHOUSE_HEAT_WAVE_TODAY_DAY ||
        warning.code === WarningCode.GREENHOUSE_HEAT_WAVE_TOMORROW_DAY ||
        warning.code === WarningCode.GREENHOUSE_SNOW_LOAD_TODAY ||
        warning.code === WarningCode.GREENHOUSE_SNOW_LOAD_TOMORROW ||
        warning.code === WarningCode.GREENHOUSE_WET_SNOW_TODAY ||
        warning.code === WarningCode.GREENHOUSE_WET_SNOW_TOMORROW ||
        warning.code === WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT ||
        warning.code === WarningCode.GREENHOUSE_FROST_RISK_TOMORROW_NIGHT ||
        warning.code === WarningCode.GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT ||
        warning.code ===
          WarningCode.GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT ||
        warning.code === WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY ||
        warning.code === WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY ||
        warning.code === WarningCode.GREENHOUSE_STORM_TODAY_DAY ||
        warning.code === WarningCode.GREENHOUSE_STORM_TOMORROW_DAY ||
        warning.code === WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY ||
        warning.code === WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY ||
        warning.code === WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TODAY ||
        warning.code === WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW;

      let ownerScopeType: ActionTaskOwnerScopeType;
      let ownerScopeId: string;
      let targetType: ActionTaskTargetType;
      const effectiveBedId: string | null = resolvedBedId;
      let effectivePlantingId: string | null = resolvedPlantingId;

      if (isGreenHouseCode && resolvedBedId) {
        // TODO: upgrade to ownerScopeType=SPACE once WarningInstance.growingSpace is populated
        ownerScopeType = ActionTaskOwnerScopeType.BED;
        ownerScopeId = resolvedBedId;
        targetType = ActionTaskTargetType.BED;
        effectivePlantingId = null;
      } else if (isBedLevelCode && resolvedBedId) {
        ownerScopeType = ActionTaskOwnerScopeType.BED;
        ownerScopeId = resolvedBedId;
        targetType = ActionTaskTargetType.BED;
        effectivePlantingId = null; // BED-level: no direct planting
      } else if (resolvedPlantingId) {
        ownerScopeType = ActionTaskOwnerScopeType.PLANTING;
        ownerScopeId = resolvedPlantingId;
        targetType = ActionTaskTargetType.PLANTING;
      } else if (resolvedBedId) {
        ownerScopeType = ActionTaskOwnerScopeType.BED;
        ownerScopeId = resolvedBedId;
        targetType = ActionTaskTargetType.BED;
      } else {
        ownerScopeType = ActionTaskOwnerScopeType.USER;
        ownerScopeId = userId;
        targetType = ActionTaskTargetType.USER;
      }

      // Build dedupe key using ownerScope for consolidation
      const dedupeKey = this.buildDedupeKey({
        code: warning.code,
        userId,
        localDate,
        bedId: effectiveBedId,
        plantingId: effectivePlantingId,
      });

      this.logger.debug(
        `warning code=${warning.code} localDate=${localDate} dedupeKey=${dedupeKey} ownerScopeType=${ownerScopeType} ownerScopeId=${ownerScopeId}`,
      );

      const base: Omit<TaskProposal, 'title' | 'description'> = {
        dedupeKey,
        decisionType: 'GENERAL_MONITORING',
        dueAt: this.resolveTaskDueAt(warning),
        targetType,
        ownerScopeType,
        ownerScopeId,
        bedId: effectiveBedId,
        plantingId: effectivePlantingId,
        affectedPlantingIds: resolvedPlantingId ? [resolvedPlantingId] : [],
        metadata: baseMetadata,
      };

      switch (warning.code) {
        case WarningCode.WATERING_NEEDED_TODAY:
        case WarningCode.WATERING_NEEDED_TOMORROW:
          proposals.set(base.dedupeKey, {
            ...base,
            decisionType: 'WATERING',
            // Keep BED-level scope from `base` (set above by isBedLevelCode logic)
            title: 'Podlej uprawy',
            description: 'Podlewanie operacyjne zaplanowane na dziś/jutro.',
            metadata: {
              ...base.metadata,
              decisionType: 'WATERING',
              actionKind: 'WATERING',
              sourceKey: base.dedupeKey,
            },
          });
          break;

        case WarningCode.OVERWATERING_PREPARE_TODAY:
        case WarningCode.OVERWATERING_PREPARE_TOMORROW:
          proposals.set(base.dedupeKey, {
            ...base,
            decisionType: 'MOISTURE_CHECK',
            targetType: ActionTaskTargetType.BED,
            title: 'Przygotuj drenaż przed opadami',
            description: 'Sprawdź odpływ i zabezpiecz grządkę.',
            metadata: {
              ...base.metadata,
              decisionType: 'MOISTURE_CHECK',
              actionKind: 'MOISTURE_CHECK',
              sourceKey: base.dedupeKey,
            },
          });
          break;

        case WarningCode.OVERWATERING_CHECK_TODAY:
        case WarningCode.OVERWATERING_CHECK_TOMORROW:
          proposals.set(base.dedupeKey, {
            ...base,
            decisionType: 'MOISTURE_CHECK',
            targetType: ActionTaskTargetType.BED,
            dueAt: warning.validTo,
            title: 'Sprawdź zastoiska po opadach',
            description: 'Skontroluj zastoje wody i korzenie.',
            metadata: {
              ...base.metadata,
              decisionType: 'MOISTURE_CHECK',
              actionKind: 'MOISTURE_CHECK',
              sourceKey: base.dedupeKey,
            },
          });
          break;

        // SOWING_PAUSE_TOO_COLD_TODAY/TOMORROW removed from switch — excluded from OPERATIONAL_TASK_CODES.
        // These are blocking: true alerts, not actionable tasks.

        case WarningCode.GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT:
        case WarningCode.GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT:
          proposals.set(base.dedupeKey, {
            ...base,
            decisionType: 'FROST_PROTECTION',
            targetType: ActionTaskTargetType.PLANTING,
            title: 'Osłoń młode siewki na noc',
            description: 'Nocą prognozowane jest ryzyko zimna.',
            metadata: {
              ...base.metadata,
              decisionType: 'FROST_PROTECTION',
              actionKind: 'FROST_PROTECTION',
              sourceKey: base.dedupeKey,
            },
          });
          break;

        case WarningCode.GREENHOUSE_HEAT_WAVE_TODAY_DAY:
        case WarningCode.GREENHOUSE_HEAT_WAVE_TOMORROW_DAY:
          proposals.set(base.dedupeKey, {
            ...base,
            targetType: ActionTaskTargetType.BED,
            title: 'Schłodź szklarnię / tunel',
            description: 'Zadbaj o wietrzenie i ograniczenie przegrzania.',
          });
          break;

        case WarningCode.GREENHOUSE_SNOW_LOAD_TODAY:
        case WarningCode.GREENHOUSE_SNOW_LOAD_TOMORROW:
        case WarningCode.GREENHOUSE_WET_SNOW_TODAY:
        case WarningCode.GREENHOUSE_WET_SNOW_TOMORROW:
          proposals.set(base.dedupeKey, {
            ...base,
            targetType: ActionTaskTargetType.BED,
            title: 'Odśnież konstrukcję',
            description: 'Usuń śnieg z dachu szklarni/tunelu.',
          });
          break;

        default:
          proposals.set(base.dedupeKey, {
            ...base,
            decisionType:
              warning.code === WarningCode.FROST_RISK_TODAY_NIGHT ||
              warning.code === WarningCode.FROST_RISK_TOMORROW_NIGHT ||
              warning.code === WarningCode.HARD_FROST_RISK_TODAY_NIGHT ||
              warning.code === WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT
                ? 'FROST_PROTECTION'
                : 'GENERAL_MONITORING',
            title:
              warning.code === WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TODAY ||
              warning.code === WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW
                ? 'Zamknij wietrzniki i osłoń uprawę'
                : warning.code === WarningCode.HEAVY_RAIN_TODAY_DAY ||
                    warning.code === WarningCode.HEAVY_RAIN_TODAY_NIGHT ||
                    warning.code === WarningCode.HEAVY_RAIN_TOMORROW_DAY ||
                    warning.code === WarningCode.HEAVY_RAIN_TOMORROW_NIGHT ||
                    warning.code ===
                      WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY ||
                    warning.code ===
                      WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY
                  ? 'Zabezpiecz odpływ i osłony'
                  : warning.code === WarningCode.WIND_DAMAGE_TODAY_DAY ||
                      warning.code === WarningCode.WIND_DAMAGE_TODAY_NIGHT ||
                      warning.code === WarningCode.WIND_DAMAGE_TOMORROW_DAY ||
                      warning.code === WarningCode.WIND_DAMAGE_TOMORROW_NIGHT ||
                      warning.code ===
                        WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY ||
                      warning.code ===
                        WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY ||
                      warning.code === WarningCode.GREENHOUSE_STORM_TODAY_DAY ||
                      warning.code === WarningCode.GREENHOUSE_STORM_TOMORROW_DAY
                    ? 'Zabezpiecz podpory i osłony'
                    : 'Zabezpiecz rośliny na noc',
            description: 'Operacyjne działanie pogodowe na dziś/jutro.',
            metadata: {
              ...base.metadata,
              decisionType:
                warning.code === WarningCode.FROST_RISK_TODAY_NIGHT ||
                warning.code === WarningCode.FROST_RISK_TOMORROW_NIGHT ||
                warning.code === WarningCode.HARD_FROST_RISK_TODAY_NIGHT ||
                warning.code === WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT
                  ? 'FROST_PROTECTION'
                  : 'GENERAL_MONITORING',
              actionKind:
                warning.code === WarningCode.FROST_RISK_TODAY_NIGHT ||
                warning.code === WarningCode.FROST_RISK_TOMORROW_NIGHT ||
                warning.code === WarningCode.HARD_FROST_RISK_TODAY_NIGHT ||
                warning.code === WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT
                  ? 'FROST_PROTECTION'
                  : 'GENERAL_MONITORING',
              sourceKey: base.dedupeKey,
            },
          });
      }
    }

    const proposalByDate: Record<string, number> = {};
    for (const proposal of proposals.values()) {
      const localDateValue = proposal.metadata?.localDate;
      if (typeof localDateValue !== 'string') {
        continue;
      }
      proposalByDate[localDateValue] =
        (proposalByDate[localDateValue] ?? 0) + 1;
    }

    const proposalByDateSummary = Object.entries(proposalByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => `${date}:${count}`)
      .join(',');

    this.logger.debug(
      `planner user=${userId} warnings=${warnings.length} proposals=${proposals.size} byDate=${proposalByDateSummary || 'none'} skippedUnsupported=${skippedUnsupportedCode} skippedMissingLocalDate=${skippedMissingLocalDate} skippedOutsideTodayTomorrow=${skippedOutsideTodayTomorrow}`,
    );

    return Array.from(proposals.values());
  }

  private filterProposalsByHistory(
    proposals: TaskProposal[],
    recentCompletedEvents: PlantingEvent[],
    recentlyCanceledTasks: ActionTask[],
    now: Date,
  ): TaskProposal[] {
    const completedKeys = new Set(
      recentCompletedEvents
        .map((event) => {
          const decisionType = event.payload?.decisionType;
          if (typeof decisionType !== 'string') return null;
          return `${decisionType}:${event.planting.id}`;
        })
        .filter((value): value is string => Boolean(value)),
    );

    const canceledKeys = new Set(
      recentlyCanceledTasks
        .map((task) => {
          const decisionType = task.metadata?.decisionType;
          if (typeof decisionType !== 'string') return null;
          const plantingId = task.planting?.id ?? 'none';
          const bedId = task.bed?.id ?? 'none';
          return `${decisionType}:${plantingId}:${bedId}`;
        })
        .filter((value): value is string => Boolean(value)),
    );

    const deduped = new Map<string, TaskProposal>();

    for (const proposal of proposals) {
      const plantingId = proposal.plantingId ?? 'none';
      const bedId = proposal.bedId ?? 'none';
      const decisionType = proposal.decisionType;

      if (completedKeys.has(`${decisionType}:${plantingId}`)) {
        continue;
      }

      if (canceledKeys.has(`${decisionType}:${plantingId}:${bedId}`)) {
        continue;
      }

      const localDate =
        typeof proposal.metadata?.localDate === 'string'
          ? proposal.metadata.localDate
          : now.toISOString().slice(0, 10);
      const fingerprint = `${decisionType}:${proposal.targetType}:${plantingId}:${bedId}:${localDate}`;

      if (!deduped.has(fingerprint)) {
        deduped.set(fingerprint, proposal);
      }
    }

    return Array.from(deduped.values());
  }

  private resolveLocalDate(warning: WarningInstance): string | null {
    const localDate = warning.details?.localDate;
    if (
      typeof localDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(localDate)
    ) {
      return localDate;
    }
    if (
      warning.validFrom instanceof Date &&
      !Number.isNaN(warning.validFrom.getTime())
    ) {
      return warning.validFrom.toISOString().slice(0, 10);
    }
    return null;
  }

  private buildDedupeKey(params: {
    code: WarningCode;
    userId: string;
    localDate: string;
    bedId?: string | null;
    plantingId?: string | null;
  }): string {
    const base = `weather:${params.code}:${params.userId}:${params.localDate}`;
    if (params.plantingId) {
      return `${base}:planting:${params.plantingId}`;
    }
    if (params.bedId) {
      return `${base}:bed:${params.bedId}`;
    }
    return base;
  }

  private isTodayOrTomorrow(
    localDate: string,
    warning: WarningInstance,
    now: Date,
  ): boolean {
    const timezone = warning.details?.timezone;
    const timeZone =
      typeof timezone === 'string' && timezone.length > 0 ? timezone : 'UTC';
    const today = getLocalDate(now, timeZone);
    const tomorrow = localDatePlusDays(today, 1);
    return localDate === today || localDate === tomorrow;
  }

  private resolveTaskDueAt(warning: WarningInstance): Date {
    const localDate = this.resolveLocalDate(warning);
    const timezone = warning.details?.timezone;
    const timeZone =
      typeof timezone === 'string' && timezone.length > 0 ? timezone : 'UTC';

    if (localDate) {
      const localNoon = this.localDateAtHourUtc(localDate, timeZone, 12);
      if (localNoon) {
        return localNoon;
      }
    }

    if (
      warning.validFrom instanceof Date &&
      !Number.isNaN(warning.validFrom.getTime())
    ) {
      return new Date(warning.validFrom.getTime() + 12 * 60 * 60 * 1000);
    }

    return new Date();
  }

  private localDateAtHourUtc(
    localDate: string,
    timeZone: string,
    hour: number,
  ): Date | null {
    const [yearRaw, monthRaw, dayRaw] = localDate.split('-').map(Number);
    if (!yearRaw || !monthRaw || !dayRaw) {
      return null;
    }

    let utcTs = Date.UTC(yearRaw, monthRaw - 1, dayRaw, hour, 0, 0, 0);
    const targetTs = Date.UTC(yearRaw, monthRaw - 1, dayRaw, hour, 0, 0, 0);

    for (let i = 0; i < 4; i += 1) {
      const local = this.toParts(new Date(utcTs), timeZone);
      const localTs = Date.UTC(
        local.year,
        local.month - 1,
        local.day,
        local.hour,
        local.minute,
        local.second,
        0,
      );
      const diff = targetTs - localTs;
      if (diff === 0) {
        break;
      }
      utcTs += diff;
    }

    return new Date(utcTs);
  }

  private toParts(
    date: Date,
    timeZone: string,
  ): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const partByType = new Map(parts.map((item) => [item.type, item.value]));

    return {
      year: Number(partByType.get('year') ?? '1970'),
      month: Number(partByType.get('month') ?? '01'),
      day: Number(partByType.get('day') ?? '01'),
      hour: Number(partByType.get('hour') ?? '00'),
      minute: Number(partByType.get('minute') ?? '00'),
      second: Number(partByType.get('second') ?? '00'),
    };
  }
}
