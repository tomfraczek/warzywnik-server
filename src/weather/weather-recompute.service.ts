import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { PlantingStatus } from '../common/enums/planting.enums';
import { ActionTask } from '../action-tasks/action-task.entity';
import { ActionTaskStatus } from '../common/enums/action.enums';
import { ActionAutomationService } from '../action-tasks/action-automation.service';
import { PlantingsService } from '../plantings/plantings.service';
import { TasksResponseDto, type TaskDto } from './dto/tasks-response.dto';
import { WarningDto, WarningsResponseDto } from './dto/warnings-response.dto';
import { WeatherBasis } from './weather.types';

type WarningCacheEntry = {
  computedAt: Date;
  weatherBasis: WeatherBasis;
  items: WarningDto[];
};

@Injectable()
export class WeatherRecomputeService {
  private readonly logger = new Logger(WeatherRecomputeService.name);
  private readonly warningsCache = new Map<string, WarningCacheEntry>();
  private readonly tasksComputedAt = new Map<string, Date>();

  constructor(
    private readonly em: EntityManager,
    private readonly actionAutomationService: ActionAutomationService,
    private readonly plantingsService: PlantingsService,
  ) {}

  async recomputeWarnings(userId: string, weatherBasis: WeatherBasis) {
    const user = await this.requireUser(userId);
    const items = await this.plantingsService.listWarningsForUser(user);

    this.warningsCache.set(userId, {
      computedAt: new Date(),
      weatherBasis,
      items: items.map((warning) => ({
        code: warning.code,
        severity: warning.severity,
        title: warning.title,
        message: warning.message,
        hint: warning.hint ?? null,
        details: warning.details ?? null,
      })),
    });

    this.logger.log(
      `recomputed warnings for user=${userId} count=${items.length} basis=${weatherBasis}`,
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

    this.tasksComputedAt.set(userId, new Date());
    this.logger.log(
      `recomputed tasks for user=${userId} plantings=${plantings.length}`,
    );
  }

  async getWarningsResponse(
    userId: string,
    weatherBasis: WeatherBasis,
  ): Promise<WarningsResponseDto> {
    const cacheEntry = this.warningsCache.get(userId);

    if (!cacheEntry) {
      await this.recomputeWarnings(userId, weatherBasis);
    } else if (cacheEntry.weatherBasis !== weatherBasis) {
      await this.recomputeWarnings(userId, weatherBasis);
    }

    const finalEntry = this.warningsCache.get(userId);

    return {
      computedAt: (finalEntry?.computedAt ?? new Date()).toISOString(),
      weatherBasis,
      items: finalEntry?.items ?? [],
    };
  }

  async getTasksResponse(userId: string): Promise<TasksResponseDto> {
    await this.requireUser(userId);

    const items = await this.em.find(
      ActionTask,
      {
        user: userId,
        status: { $in: [ActionTaskStatus.PENDING, ActionTaskStatus.DONE] },
      },
      {
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      },
    );

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
    }));

    const computedAt = this.tasksComputedAt.get(userId) ?? new Date();

    return {
      computedAt: computedAt.toISOString(),
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
}
