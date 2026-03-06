import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { LocationEventsService } from '../locations/location-events.service';
import {
  LOCATION_UPDATED_EVENT,
  type LocationUpdatedPayload,
  WEATHER_SNAPSHOT_UPDATED_EVENT,
  type WeatherSnapshotUpdatedPayload,
} from '../locations/location-events.constants';
import { WeatherService } from './weather.service';
import { WeatherRecomputeService } from './weather-recompute.service';

@Injectable()
export class WeatherEventsHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeatherEventsHandler.name);
  private readonly weatherRecomputeQueueByUser = new Map<
    string,
    Promise<void>
  >();
  private readonly lastProcessedSnapshotKeyByUser = new Map<string, string>();

  constructor(
    private readonly locationEventsService: LocationEventsService,
    private readonly weatherService: WeatherService,
    private readonly weatherRecomputeService: WeatherRecomputeService,
  ) {}

  onModuleInit(): void {
    this.locationEventsService.on(
      LOCATION_UPDATED_EVENT,
      this.handleLocationUpdated,
    );
    this.locationEventsService.on(
      WEATHER_SNAPSHOT_UPDATED_EVENT,
      this.handleWeatherSnapshotUpdated,
    );
  }

  onModuleDestroy(): void {
    this.locationEventsService.off(
      LOCATION_UPDATED_EVENT,
      this.handleLocationUpdated,
    );
    this.locationEventsService.off(
      WEATHER_SNAPSHOT_UPDATED_EVENT,
      this.handleWeatherSnapshotUpdated,
    );
  }

  private readonly handleLocationUpdated = (
    payload: LocationUpdatedPayload | WeatherSnapshotUpdatedPayload,
  ): void => {
    const castedPayload = payload as LocationUpdatedPayload;

    void this.processLocationUpdated(castedPayload);
  };

  private readonly handleWeatherSnapshotUpdated = (
    payload: LocationUpdatedPayload | WeatherSnapshotUpdatedPayload,
  ): void => {
    const castedPayload = payload as WeatherSnapshotUpdatedPayload;

    void this.enqueueWeatherSnapshotUpdated(castedPayload);
  };

  private enqueueWeatherSnapshotUpdated(
    payload: WeatherSnapshotUpdatedPayload,
  ): void {
    const userId = payload.userId;
    const queue = this.weatherRecomputeQueueByUser.get(userId);
    const previous = queue ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const snapshotKey = `${payload.fetchedAt}|${payload.stale ? '1' : '0'}`;
        const lastKey = this.lastProcessedSnapshotKeyByUser.get(userId);

        if (lastKey === snapshotKey) {
          this.logger.debug(
            `skip duplicate WEATHER_SNAPSHOT_UPDATED user=${userId} key=${snapshotKey}`,
          );
          return;
        }

        this.lastProcessedSnapshotKeyByUser.set(userId, snapshotKey);
        await this.processWeatherSnapshotUpdated(payload);
      })
      .catch((error: unknown) => {
        this.logger.error(
          `recompute failed user=${userId}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      })
      .finally(() => {
        if (this.weatherRecomputeQueueByUser.get(userId) === next) {
          this.weatherRecomputeQueueByUser.delete(userId);
        }
      });

    this.weatherRecomputeQueueByUser.set(userId, next);
  }

  private async processLocationUpdated(
    payload: LocationUpdatedPayload,
  ): Promise<void> {
    try {
      await this.weatherService.invalidateSnapshotForUser(payload.userId);
      await this.weatherService.refreshSnapshotForUser({
        userId: payload.userId,
        reason: LOCATION_UPDATED_EVENT,
        force: true,
      });
    } catch (error) {
      this.logger.warn(
        `location update weather refresh failed for user=${payload.userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async processWeatherSnapshotUpdated(
    payload: WeatherSnapshotUpdatedPayload,
  ): Promise<void> {
    const weatherBasis = payload.stale ? 'STALE' : 'FRESH';

    await this.weatherRecomputeService.recomputeWarnings(
      payload.userId,
      weatherBasis,
    );
    await this.weatherRecomputeService.recomputeTasks(payload.userId);
  }
}
