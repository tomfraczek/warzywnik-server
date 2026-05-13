import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTask } from '../action-task.entity';
import { Planting } from '../../plantings/planting.entity';
import {
  ActionTaskSource,
  ActionTaskStatus,
} from '../../common/enums/action.enums';
import { WarningInstance } from '../../weather/warnings/warning-instance.entity';
import { WeatherSnapshot } from '../../weather/weather-snapshot.entity';
import { PlantingEvent } from '../../planting-insights/planting-event.entity';
import { PlantingEventType } from '../../common/enums/planting-event.enums';
import { PlantingDecisionContext } from './decision.types';
import { WarningScope } from '../../common/enums/warning.enums';

export class PlantingDecisionContextBuilder {
  async build(params: {
    em: EntityManager;
    planting: Planting;
    now?: Date;
  }): Promise<PlantingDecisionContext> {
    const now = params.now ?? new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      latestWeatherSnapshot,
      activeWarnings,
      pendingTasks,
      canceledTasks,
      completedEventsRaw,
    ] = await Promise.all([
      params.em.findOne(
        WeatherSnapshot,
        { user: params.planting.user.id },
        { orderBy: { fetchedAt: 'desc' } },
      ),
      params.em.find(WarningInstance, {
        user: params.planting.user.id,
        isActive: true,
        validTo: { $gt: now },
        $or: [
          { scope: WarningScope.USER },
          { bed: params.planting.bed.id },
          { planting: params.planting.id },
        ],
      }),
      params.em.find(
        ActionTask,
        {
          user: params.planting.user.id,
          source: ActionTaskSource.VEGETABLE_RULE,
          status: ActionTaskStatus.PENDING,
          $or: [{ planting: params.planting.id }],
        },
        { populate: ['actionTemplate', 'planting'] },
      ),
      params.em.find(
        ActionTask,
        {
          user: params.planting.user.id,
          source: ActionTaskSource.VEGETABLE_RULE,
          status: ActionTaskStatus.CANCELED,
          updatedAt: { $gte: since7d },
          $or: [{ planting: params.planting.id }],
        },
        { populate: ['actionTemplate', 'planting'] },
      ),
      params.em.find(PlantingEvent, {
        userId: params.planting.user.id,
        bedId: params.planting.bed.id,
        eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
        eventTime: { $gte: since7d },
      }),
    ]);

    const completedEvents = completedEventsRaw.filter((event) => {
      if (event.planting?.id === params.planting.id) {
        return true;
      }

      return event.payload?.scope === 'bed';
    });

    const weatherDaily = latestWeatherSnapshot?.data?.daily ?? [];
    const weatherHourly = latestWeatherSnapshot?.data?.hourly ?? [];

    const recentPrecipMm24h = weatherHourly
      .slice(0, 24)
      .reduce((sum, point) => sum + (point.precip ?? 0), 0);

    const recentPrecipMm72h = weatherHourly
      .slice(0, 72)
      .reduce((sum, point) => sum + (point.precip ?? 0), 0);

    const forecastPrecipMm24h = weatherDaily
      .slice(0, 1)
      .reduce((sum, point) => sum + (point.precipSum ?? 0), 0);

    const forecastPrecipMm48h = weatherDaily
      .slice(0, 2)
      .reduce((sum, point) => sum + (point.precipSum ?? 0), 0);

    const forecastMaxTemp24h = weatherDaily[0]?.tempMax ?? null;

    return {
      now,
      planting: params.planting,
      latestWeatherSnapshot,
      activeWarnings,
      pendingTasks,
      recentlyCanceledTasks: canceledTasks,
      recentCompletedActionEvents: completedEvents,
      recentPrecipMm24h,
      recentPrecipMm72h,
      forecastPrecipMm24h,
      forecastPrecipMm48h,
      forecastMaxTemp24h,
    };
  }
}
