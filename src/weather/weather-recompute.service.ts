import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { ActionTask } from '../action-tasks/action-task.entity';
import {
  ActionTaskSource,
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../common/enums/action.enums';
import { ActionAutomationService } from '../action-tasks/action-automation.service';
import {
  TasksResponseDto,
  type TaskDto,
  type TaskMetaDto,
} from './dto/tasks-response.dto';
import { WarningDto, WarningsResponseDto } from './dto/warnings-response.dto';
import { WeatherBasis } from './weather.types';
import { WeatherService } from './weather.service';
import {
  WarningsService,
  type WarningOutput,
} from '../warning-rules/warnings.service';
import {
  WarningCode,
  WarningScope,
  WarningSeverity,
} from '../common/enums/warning.enums';
import { WeatherWarningOrchestratorService } from './warnings/weather-warning-orchestrator.service';
import { WeatherTaskPlannerService } from './warnings/weather-task-planner.service';
import { WeatherSnapshot } from './weather-snapshot.entity';
import { Bed } from '../beds/bed.entity';
import { ACTIVE_PLANTING_STATUSES } from '../plantings/planting-lifecycle';
import { WeatherStatusService } from './weather-status.service';
import { WeatherNotificationState } from '../notifications/entities/weather-notification-state.entity';
import { NotificationEventService } from '../notifications/notification-event.service';
import { NotificationPriority } from '../common/enums/notification.enums';

type TaskStatusFilter = 'pending' | 'done' | 'all';

@Injectable()
export class WeatherRecomputeService {
  private readonly logger = new Logger(WeatherRecomputeService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly actionAutomationService: ActionAutomationService,
    private readonly weatherService: WeatherService,
    private readonly warningsService: WarningsService,
    private readonly weatherWarningOrchestrator: WeatherWarningOrchestratorService,
    private readonly weatherTaskPlannerService: WeatherTaskPlannerService,
    private readonly weatherStatusService: WeatherStatusService,
    private readonly notificationEventService: NotificationEventService,
  ) {}

  async recomputeWarnings(userId: string, _weatherBasis?: WeatherBasis) {
    void _weatherBasis;
    await this.requireUser(userId);
    const result =
      await this.weatherWarningOrchestrator.recomputeForUser(userId);

    await this.emitWeatherNotificationEvents(userId, result.computedAt);

    this.logger.log(
      `recomputed warnings for user=${userId} count=${result.activeCount}`,
    );
  }

  private async emitWeatherNotificationEvents(
    userId: string,
    computedAt: Date,
  ): Promise<void> {
    const [snapshotData, warningInstances] = await Promise.all([
      this.weatherService.getLatestSnapshotDataForUser(userId),
      this.weatherWarningOrchestrator.listActiveForUser(userId),
    ]);

    const warningDtos: WarningDto[] = warningInstances.map((warning) => ({
      code: warning.code,
      severity: warning.code.includes('HARD')
        ? WarningSeverity.CRITICAL
        : warning.code.includes('FROST') ||
            warning.code.includes('HEAVY_RAIN') ||
            warning.code.includes('STORM')
          ? WarningSeverity.WARNING
          : WarningSeverity.INFO,
      title: warning.code,
      message: warning.code,
      hint: null,
      details: warning.details ?? null,
      dedupeKey: warning.dedupeKey,
      scope: warning.scope,
      bedId: warning.bed?.id ?? null,
      bedName: warning.bed?.name ?? null,
      plantingId: warning.planting?.id ?? null,
      vegetableName: warning.planting?.vegetable?.name ?? null,
      localDate: null,
      dayPart: null,
      validFrom: warning.validFrom.toISOString(),
      validTo: warning.validTo.toISOString(),
    }));

    const weatherStatus = this.weatherStatusService.buildNearTermWeatherStatus(
      snapshotData,
      computedAt,
    );
    const gardenRisk =
      this.weatherStatusService.buildGardenRiskStatus(warningDtos);

    let state = await this.em.findOne(WeatherNotificationState, {
      user: userId,
    });

    if (!state) {
      state = new WeatherNotificationState();
      state.user = this.em.getReference(User, userId);
    }

    const previousWeatherStatus = state.lastWeatherStatus;
    const previousGardenRisk = state.lastGardenRiskStatus;

    const weatherPriority = this.mapStatusSeverityToPriority(
      weatherStatus.severity,
    );
    const riskPriority = this.mapStatusSeverityToPriority(gardenRisk.severity);

    const weatherChanged =
      previousWeatherStatus != null &&
      previousWeatherStatus !== weatherStatus.code &&
      weatherPriority !== NotificationPriority.LOW;

    const gardenRiskIncreased = this.isGardenRiskIncrease(
      previousGardenRisk,
      gardenRisk.code,
    );

    state.lastWeatherStatus = weatherStatus.code;
    state.lastWeatherStatusSeverity = weatherPriority;
    state.lastGardenRiskStatus = gardenRisk.code;
    state.lastGardenRiskSeverity = riskPriority;
    state.lastComputedAt = computedAt;

    this.em.persist(state);
    await this.em.flush();

    await this.notificationEventService.publishWeatherEvents({
      userId,
      recomputeKey: computedAt.toISOString(),
      weatherStatusCode: weatherStatus.code,
      weatherStatusPriority: weatherPriority,
      weatherChanged,
      gardenRiskCode: gardenRisk.code,
      gardenRiskPriority: riskPriority,
      gardenRiskIncreased,
      warningInstances,
    });
  }

  private mapStatusSeverityToPriority(severity: string): NotificationPriority {
    if (severity === 'danger') {
      return NotificationPriority.CRITICAL;
    }

    if (severity === 'warning') {
      return NotificationPriority.HIGH;
    }

    if (severity === 'info') {
      return NotificationPriority.NORMAL;
    }

    return NotificationPriority.LOW;
  }

  private isGardenRiskIncrease(
    previousCode: string | null | undefined,
    currentCode: string,
  ): boolean {
    const rank = (code: string | null | undefined): number => {
      if (!code || code === 'OK' || code === 'none' || code === 'low') {
        return 0;
      }

      if (code.includes('WATCH') || code === 'medium') {
        return 1;
      }

      if (code.includes('WARNING') || code === 'high') {
        return 2;
      }

      if (code.includes('CRITICAL')) {
        return 3;
      }

      return 1;
    };

    return rank(currentCode) > rank(previousCode) && rank(currentCode) >= 1;
  }

  async recomputeTasks(userId: string): Promise<void> {
    const user = await this.requireUser(userId);

    if (user.automaticTasksEnabled === false) {
      this.logger.log(
        `skip recompute tasks for user=${userId} automaticTasksEnabled=false`,
      );
      return;
    }

    const plantings = await this.em.find(Planting, {
      user: user.id,
      bed: { isActive: true },
      status: {
        $in: ACTIVE_PLANTING_STATUSES,
      },
    });

    for (const planting of plantings) {
      await this.actionAutomationService.recomputeForPlanting({
        user,
        plantingId: planting.id,
        reason: 'WEATHER_SNAPSHOT_UPDATED',
      });
    }

    await this.weatherTaskPlannerService.recomputeWeatherTasksForUser(userId);

    this.logger.log(
      `recomputed tasks for user=${userId} plantings=${plantings.length}`,
    );
  }

  async getWarningsResponse(
    userId: string,
    _weatherBasis: WeatherBasis,
  ): Promise<WarningsResponseDto> {
    void _weatherBasis;
    await this.requireUser(userId);
    const weatherBasis =
      await this.weatherService.tryEnsureWeatherBasis(userId);

    let instances =
      await this.weatherWarningOrchestrator.listActiveForUser(userId);

    const newestComputedAt = instances.reduce<Date | null>((acc, item) => {
      if (!acc || item.computedAt > acc) {
        return item.computedAt;
      }
      return acc;
    }, null);

    const isStale =
      !newestComputedAt ||
      Date.now() - newestComputedAt.getTime() > 30 * 60 * 1000;

    const latestSnapshot = await this.em.findOne(
      WeatherSnapshot,
      { user: userId },
      { orderBy: { fetchedAt: 'desc' } },
    );

    const hasNewerWeatherSnapshot =
      !!latestSnapshot &&
      (!newestComputedAt || latestSnapshot.fetchedAt > newestComputedAt);

    if (instances.length === 0 || isStale || hasNewerWeatherSnapshot) {
      await this.recomputeWarnings(userId, weatherBasis);
      instances =
        await this.weatherWarningOrchestrator.listActiveForUser(userId);
    }

    const buildFromInstances = async (source: typeof instances) => {
      const rulesMap = await this.warningsService.getRulesMap(
        source.map((instance) => instance.code),
      );

      const built: Array<{
        instance: (typeof source)[number];
        warning: WarningOutput;
      }> = [];

      for (const instance of source) {
        const fallbackValues: Record<string, string | number> = {};

        const resolvedBedName =
          instance.bed?.name ?? instance.planting?.bed?.name ?? null;
        if (resolvedBedName) {
          fallbackValues.bedName = resolvedBedName;
        }

        const resolvedVegetableName =
          instance.planting?.vegetable?.name ?? null;
        if (resolvedVegetableName) {
          fallbackValues.vegetableName = resolvedVegetableName;
        }

        const candidate = {
          code: instance.code,
          values: { ...fallbackValues, ...instance.values },
          details: instance.details ?? undefined,
        };

        const [warning] = await this.warningsService.buildWarnings(
          [candidate],
          rulesMap,
        );

        if (!warning) {
          continue;
        }

        built.push({ instance, warning });
      }

      return built;
    };

    let built = await buildFromInstances(instances);

    const hasUnresolvedPlaceholder = (text?: string | null) =>
      !!text && /\{\s*[^{}]+\s*\}/.test(text);

    const hasUnresolved = built.some(
      ({ warning }) =>
        hasUnresolvedPlaceholder(warning.message) ||
        hasUnresolvedPlaceholder(warning.hint),
    );

    if (hasUnresolved) {
      this.logger.warn(
        `detected unresolved warning placeholder(s) for user=${userId}, forcing recompute`,
      );
      await this.recomputeWarnings(userId, weatherBasis);
      instances =
        await this.weatherWarningOrchestrator.listActiveForUser(userId);
      built = await buildFromInstances(instances);
    }

    const items: WarningDto[] = built.map(({ warning, instance }) => {
      const detailsLocalDate = instance.details?.localDate;
      const detailsDayPart = instance.details?.dayPart;
      return {
        dedupeKey: `weather:${instance.dedupeKey}`,
        code: warning.code,
        severity: warning.severity,
        title: warning.title,
        message: warning.message,
        hint: warning.hint ?? null,
        details: warning.details ?? null,
        scope: instance?.scope ?? WarningScope.USER,
        bedId: instance?.bed?.id ?? null,
        bedName: instance?.bed?.name ?? null,
        plantingId: instance?.planting?.id ?? null,
        vegetableName: instance?.planting?.vegetable?.name ?? null,
        localDate:
          typeof detailsLocalDate === 'string' ? detailsLocalDate : null,
        dayPart:
          detailsDayPart === 'DAY' ||
          detailsDayPart === 'NIGHT' ||
          detailsDayPart === 'ANY'
            ? detailsDayPart
            : null,
        validFrom:
          instance.validFrom instanceof Date
            ? instance.validFrom.toISOString()
            : null,
        validTo:
          instance.validTo instanceof Date
            ? instance.validTo.toISOString()
            : null,
      };
    });

    const computedAt = instances.reduce<Date | null>((acc, instance) => {
      if (!acc || instance.computedAt > acc) {
        return instance.computedAt;
      }
      return acc;
    }, null);

    return {
      computedAt: (computedAt ?? new Date()).toISOString(),
      weatherBasis,
      items,
    };
  }

  async getTasksResponse(
    userId: string,
    statusFilter: TaskStatusFilter = 'pending',
  ): Promise<TasksResponseDto> {
    const user = await this.requireUser(userId);

    const statusCondition =
      statusFilter === 'all'
        ? { $in: [ActionTaskStatus.PENDING, ActionTaskStatus.DONE] }
        : statusFilter === 'done'
          ? ActionTaskStatus.DONE
          : ActionTaskStatus.PENDING;

    const items = await this.em.find(
      ActionTask,
      {
        user: userId,
        status: statusCondition,
        $or: [
          { bed: null, planting: null },
          { bed: { isActive: true } },
          { planting: { bed: { isActive: true } } },
        ],
      },
      {
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        populate: ['bed', 'planting', 'planting.bed', 'planting.vegetable'],
      },
    );

    const hasUserScopeWeatherTask = items.some(
      (item) =>
        item.source === ActionTaskSource.WEATHER_WARNING &&
        item.targetType === ActionTaskTargetType.USER,
    );

    let activeBedsCountForUserScope: number | undefined;
    if (hasUserScopeWeatherTask) {
      activeBedsCountForUserScope = await this.em.count(Bed, {
        user: userId,
        isActive: true,
      });
    }

    const mapped: TaskDto[] = items.map((item) => {
      const resolvedPlantingId = item.planting?.id ?? null;
      const resolvedBed = item.bed ?? item.planting?.bed ?? null;
      const resolvedBedId = resolvedBed?.id ?? null;
      const resolvedBedName = resolvedBed?.name ?? null;
      const resolvedVegetableName = item.planting?.vegetable?.name ?? null;

      return {
        id: item.id,
        title: item.title,
        description: item.description ?? null,
        dueAt: item.dueAt?.toISOString() ?? null,
        status: item.status,
        source: item.source,
        targetType: item.targetType,
        plantingId: resolvedPlantingId,
        bedId: resolvedBedId,
        vegetableName: resolvedVegetableName,
        bedName: resolvedBedName,
        growingSpaceId: item.growingSpace?.id ?? null,
        isManuallyRescheduled: item.isManuallyRescheduled,
        meta: this.buildTaskMeta(item, user, activeBedsCountForUserScope),
      };
    });

    return {
      computedAt: new Date().toISOString(),
      items: mapped,
    };
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private buildTaskMeta(
    item: ActionTask,
    user: User,
    activeBedsCountForUserScope?: number,
  ): TaskMetaDto | null {
    if (item.source !== ActionTaskSource.WEATHER_WARNING) {
      return null;
    }

    const warningCode = this.extractWarningCode(item.dedupeKey);
    const resolvedBed = item.bed ?? item.planting?.bed ?? null;

    if (item.targetType === ActionTaskTargetType.USER) {
      return {
        scope: WarningScope.USER,
        affectsAllBeds: true,
        affectedBedsCount: activeBedsCountForUserScope,
        locationLabel: user.locationLabel ?? null,
        warningCode: warningCode ?? undefined,
      };
    }

    if (item.targetType === ActionTaskTargetType.BED) {
      return {
        scope: WarningScope.BED,
        affectsAllBeds: false,
        affectedBedIds: resolvedBed?.id ? [resolvedBed.id] : undefined,
        warningCode: warningCode ?? undefined,
      };
    }

    return {
      scope: WarningScope.PLANTING,
      affectsAllBeds: false,
      affectedBedIds: resolvedBed?.id ? [resolvedBed.id] : undefined,
      warningCode: warningCode ?? undefined,
    };
  }

  private extractWarningCode(dedupeKey?: string | null) {
    if (!dedupeKey) {
      return null;
    }

    const match = /:code:([^:]+)$/.exec(dedupeKey);
    return (match?.[1] as WarningCode | undefined) ?? null;
  }
}
