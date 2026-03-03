import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { PlantingStatus } from '../common/enums/planting.enums';
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
import { WarningCode, WarningScope } from '../common/enums/warning.enums';
import { WeatherWarningOrchestratorService } from './warnings/weather-warning-orchestrator.service';
import { WeatherTaskPlannerService } from './warnings/weather-task-planner.service';
import { WeatherSnapshot } from './weather-snapshot.entity';
import { Bed } from '../beds/bed.entity';

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
  ) {}

  async recomputeWarnings(userId: string, _weatherBasis?: WeatherBasis) {
    void _weatherBasis;
    await this.requireUser(userId);
    const result =
      await this.weatherWarningOrchestrator.recomputeForUser(userId);
    this.logger.log(
      `recomputed warnings for user=${userId} count=${result.activeCount}`,
    );
  }

  async recomputeTasks(userId: string): Promise<void> {
    const user = await this.requireUser(userId);

    const plantings = await this.em.find(Planting, {
      user: user.id,
      status: {
        $in: [
          PlantingStatus.PLANNED,
          PlantingStatus.ACTIVE,
          PlantingStatus.HARVESTING,
        ],
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
      },
      {
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
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

    const mapped: TaskDto[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description ?? null,
      dueAt: item.dueAt?.toISOString() ?? null,
      status: item.status,
      source: item.source,
      targetType: item.targetType,
      plantingId: item.planting?.id ?? null,
      bedId: item.bed?.id ?? null,
      isManuallyRescheduled: item.isManuallyRescheduled,
      meta: this.buildTaskMeta(item, user, activeBedsCountForUserScope),
    }));

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
        affectedBedIds: item.bed?.id ? [item.bed.id] : undefined,
        warningCode: warningCode ?? undefined,
      };
    }

    return {
      scope: WarningScope.PLANTING,
      affectsAllBeds: false,
      affectedBedIds: item.bed?.id ? [item.bed.id] : undefined,
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
