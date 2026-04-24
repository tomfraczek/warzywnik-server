import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { WeatherService } from './weather.service';
import { ACTIVE_PLANTING_STATUSES } from '../plantings/planting-lifecycle';

@Injectable()
export class WeatherRefreshScheduler {
  private readonly logger = new Logger(WeatherRefreshScheduler.name);
  private readonly parallelLimit = 5;

  constructor(
    private readonly em: EntityManager,
    private readonly weatherService: WeatherService,
  ) {}

  @Cron('0,30 * * * *', { name: 'weather-refresh' })
  async refreshWeatherSnapshots(): Promise<void> {
    const candidateUserIds = await this.selectUsersToRefresh();

    if (candidateUserIds.length === 0) {
      return;
    }

    let refreshed = 0;

    await this.runWithConcurrency(
      candidateUserIds,
      this.parallelLimit,
      async (userId) => {
        try {
          const didRefresh = await this.weatherService.refreshIfExpiringSoon({
            userId,
            reason: 'CRON_REFRESH',
            preemptiveMinutes: 15,
          });

          if (didRefresh) {
            refreshed += 1;
          }
        } catch (error) {
          this.logger.warn(
            `cron weather refresh failed for user=${userId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    );

    this.logger.log(
      `cron weather refresh done users=${candidateUserIds.length} refreshed=${refreshed}`,
    );
  }

  private async selectUsersToRefresh(): Promise<string[]> {
    const activePlantings = await this.em.find(
      Planting,
      {
        status: {
          $in: ACTIVE_PLANTING_STATUSES,
        },
      },
      {
        fields: ['user'],
      },
    );

    const activeUserIds = new Set(activePlantings.map((item) => item.user.id));

    const usersWithLocation = await this.em.find(
      User,
      {
        locationLat: { $ne: null },
        locationLon: { $ne: null },
      },
      {
        fields: ['id'],
      },
    );

    if (activeUserIds.size > 0) {
      return usersWithLocation
        .map((item) => item.id)
        .filter((id) => activeUserIds.has(id));
    }

    return usersWithLocation.map((item) => item.id);
  }

  private async runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    let currentIndex = 0;

    const consume = async () => {
      while (currentIndex < items.length) {
        const index = currentIndex;
        currentIndex += 1;
        await worker(items[index]);
      }
    };

    const runners = Array.from(
      { length: Math.min(concurrency, items.length) },
      () => consume(),
    );

    await Promise.all(runners);
  }
}
