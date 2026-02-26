import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import {
  WeatherProvider,
  WeatherSnapshot,
  type WeatherSnapshotData,
} from './weather-snapshot.entity';
import { OpenMeteoClient } from './open-meteo.client';
import {
  mapOpenMeteoToSnapshotData,
  mapSnapshotToWeatherResponse,
} from './weather.mapper';
import { WeatherResponseDto } from './dto/weather-response.dto';
import { LocationEventsService } from '../locations/location-events.service';
import { WeatherBasis } from './weather.types';

const SNAPSHOT_TTL_MS = 60 * 60 * 1000;
const WEATHER_DATA_VERSION = 2;

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private fetchCount = 0;
  private fetchErrorCount = 0;

  constructor(
    private readonly em: EntityManager,
    private readonly openMeteoClient: OpenMeteoClient,
    private readonly locationEventsService: LocationEventsService,
  ) {}

  async getWeatherForUser(userId: string): Promise<WeatherResponseDto> {
    const user = await this.getUserWithLocationOrThrow(userId);
    const snapshot = await this.findSnapshot(user.id);

    if (!snapshot) {
      return this.fetchAndStoreSnapshot(user, 'SNAPSHOT_MISSING');
    }

    const isExpired = this.isSnapshotExpired(snapshot);
    const hasCompleteData = this.hasCompleteWeatherData(snapshot);

    if (!isExpired && hasCompleteData) {
      const response = mapSnapshotToWeatherResponse({
        snapshot,
        stale: false,
        location: this.userLocation(user),
      });

      if (!this.hasUnknownWeather(response)) {
        return response;
      }

      this.logger.warn(
        `weather snapshot contains UNKNOWN weather type for user=${user.id}, forcing refresh`,
      );
    }

    try {
      return await this.fetchAndStoreSnapshot(
        user,
        isExpired ? 'SNAPSHOT_EXPIRED' : 'SNAPSHOT_SCHEMA_MISMATCH',
      );
    } catch (error) {
      this.logger.warn(
        `weather fallback to stale snapshot for user=${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      snapshot.isStale = true;
      await this.em.flush();

      return mapSnapshotToWeatherResponse({
        snapshot,
        stale: true,
        message:
          'Pogoda chwilowo niedostępna u dostawcy. Zwracam ostatni dostępny snapshot.',
        location: this.userLocation(user),
      });
    }
  }

  async tryEnsureWeatherBasis(userId: string): Promise<WeatherBasis> {
    try {
      const weather = await this.getWeatherForUser(userId);
      return weather.stale ? 'STALE' : 'FRESH';
    } catch (error) {
      if (
        error instanceof UnprocessableEntityException ||
        error instanceof NotFoundException
      ) {
        return 'NONE';
      }

      const basis = await this.getWeatherBasis(userId);
      if (basis !== 'NONE') {
        return 'STALE';
      }

      return 'NONE';
    }
  }

  async getWeatherBasis(userId: string): Promise<WeatherBasis> {
    const user = await this.em.findOne(User, { id: userId });

    if (!user || user.locationLat == null || user.locationLon == null) {
      return 'NONE';
    }

    const snapshot = await this.findSnapshot(user.id);
    if (!snapshot) {
      return 'NONE';
    }

    if (this.isSnapshotExpired(snapshot) || snapshot.isStale) {
      return 'STALE';
    }

    return 'FRESH';
  }

  async refreshSnapshotForUser(params: {
    userId: string;
    reason: string;
    force?: boolean;
  }): Promise<WeatherResponseDto | null> {
    const user = await this.em.findOne(User, { id: params.userId });

    if (!user || user.locationLat == null || user.locationLon == null) {
      return null;
    }

    const snapshot = await this.findSnapshot(user.id);
    if (
      !params.force &&
      snapshot &&
      !this.isSnapshotExpired(snapshot) &&
      this.hasCompleteWeatherData(snapshot)
    ) {
      return mapSnapshotToWeatherResponse({
        snapshot,
        stale: false,
        location: this.userLocation(user),
      });
    }

    return this.fetchAndStoreSnapshot(user, params.reason);
  }

  async refreshIfExpiringSoon(params: {
    userId: string;
    reason: string;
    preemptiveMinutes: number;
  }): Promise<boolean> {
    const user = await this.em.findOne(User, { id: params.userId });

    if (!user || user.locationLat == null || user.locationLon == null) {
      return false;
    }

    const snapshot = await this.findSnapshot(user.id);
    const threshold = new Date(Date.now() + params.preemptiveMinutes * 60_000);

    if (
      snapshot &&
      snapshot.expiresAt > threshold &&
      this.hasCompleteWeatherData(snapshot)
    ) {
      return false;
    }

    await this.fetchAndStoreSnapshot(user, params.reason);
    return true;
  }

  async invalidateSnapshotForUser(userId: string): Promise<void> {
    const snapshot = await this.findSnapshot(userId);

    if (!snapshot) {
      return;
    }

    snapshot.expiresAt = new Date(0);
    snapshot.isStale = true;
    await this.em.flush();
  }

  private async fetchAndStoreSnapshot(
    user: User,
    reason: string,
  ): Promise<WeatherResponseDto> {
    if (user.locationLat == null || user.locationLon == null) {
      throw new UnprocessableEntityException('Ustaw lokalizację');
    }

    const startedAt = Date.now();
    this.fetchCount += 1;

    try {
      const payload = await this.openMeteoClient.fetchForecast({
        latitude: user.locationLat,
        longitude: user.locationLon,
      });
      const mappedData = mapOpenMeteoToSnapshotData(payload);
      const now = new Date();

      const snapshot =
        (await this.findSnapshot(user.id)) ??
        this.createSnapshot(user, mappedData, now);

      snapshot.locationLat = user.locationLat;
      snapshot.locationLon = user.locationLon;
      snapshot.provider = WeatherProvider.OPEN_METEO;
      snapshot.fetchedAt = now;
      snapshot.expiresAt = new Date(now.getTime() + SNAPSHOT_TTL_MS);
      snapshot.isStale = false;
      snapshot.data = mappedData;
      snapshot.dataVersion = WEATHER_DATA_VERSION;

      this.em.persist(snapshot);
      await this.em.flush();

      this.locationEventsService.emitWeatherSnapshotUpdated({
        userId: user.id,
        fetchedAt: snapshot.fetchedAt.toISOString(),
        expiresAt: snapshot.expiresAt.toISOString(),
        stale: false,
      });

      this.logFetchMetrics({
        user,
        reason,
        durationMs: Date.now() - startedAt,
        success: true,
      });

      return mapSnapshotToWeatherResponse({
        snapshot,
        stale: false,
        location: this.userLocation(user),
      });
    } catch (error) {
      this.fetchErrorCount += 1;
      this.logFetchMetrics({
        user,
        reason,
        durationMs: Date.now() - startedAt,
        success: false,
      });

      throw new ServiceUnavailableException(
        error instanceof Error
          ? error.message
          : 'Nie udało się pobrać pogody od dostawcy',
      );
    }
  }

  private createSnapshot(
    user: User,
    data: WeatherSnapshotData,
    now: Date,
  ): WeatherSnapshot {
    const snapshot = new WeatherSnapshot();
    snapshot.user = user;
    snapshot.locationLat = user.locationLat as number;
    snapshot.locationLon = user.locationLon as number;
    snapshot.provider = WeatherProvider.OPEN_METEO;
    snapshot.fetchedAt = now;
    snapshot.expiresAt = new Date(now.getTime() + SNAPSHOT_TTL_MS);
    snapshot.isStale = false;
    snapshot.data = data;
    snapshot.dataVersion = WEATHER_DATA_VERSION;
    return snapshot;
  }

  private async getUserWithLocationOrThrow(userId: string): Promise<User> {
    const user = await this.em.findOne(User, { id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.locationLat == null || user.locationLon == null) {
      throw new UnprocessableEntityException('Ustaw lokalizację');
    }

    return user;
  }

  private async findSnapshot(userId: string): Promise<WeatherSnapshot | null> {
    return this.em.findOne(
      WeatherSnapshot,
      { user: userId },
      { orderBy: { fetchedAt: 'desc' } },
    );
  }

  private isSnapshotExpired(snapshot: WeatherSnapshot): boolean {
    return snapshot.expiresAt.getTime() <= Date.now();
  }

  private hasCompleteWeatherData(snapshot: WeatherSnapshot): boolean {
    if (
      !Number.isFinite(snapshot.dataVersion) ||
      snapshot.dataVersion < WEATHER_DATA_VERSION
    ) {
      return false;
    }

    const current = snapshot.data.current;
    const daily = snapshot.data.daily;
    const hourly = snapshot.data.hourly;

    if (!current || !daily || !hourly) {
      return false;
    }

    if (typeof current.weatherCode !== 'number') {
      return false;
    }

    const hasDailyCodes = daily.every(
      (item) => typeof item.weatherCode === 'number',
    );
    const hasHourlyCodes = hourly.every(
      (item) => typeof item.weatherCode === 'number',
    );

    return hasDailyCodes && hasHourlyCodes;
  }

  private hasUnknownWeather(response: WeatherResponseDto): boolean {
    if (response.current.weatherType === 'UNKNOWN') {
      return true;
    }

    if (response.today.weatherType === 'UNKNOWN') {
      return true;
    }

    return false;
  }

  private userLocation(user: User): {
    label: string;
    lat: number;
    lon: number;
  } {
    return {
      label: user.locationLabel ?? 'Unknown location',
      lat: user.locationLat as number,
      lon: user.locationLon as number,
    };
  }

  private logFetchMetrics(params: {
    user: User;
    reason: string;
    durationMs: number;
    success: boolean;
  }): void {
    const errorRate =
      this.fetchCount > 0
        ? ((this.fetchErrorCount / this.fetchCount) * 100).toFixed(2)
        : '0.00';

    const maskedLat = this.maskCoordinate(params.user.locationLat as number);
    const maskedLon = this.maskCoordinate(params.user.locationLon as number);

    const message =
      `weather fetch reason=${params.reason}` +
      ` success=${params.success}` +
      ` durationMs=${params.durationMs}` +
      ` errorRate=${errorRate}%` +
      ` lat=${maskedLat}` +
      ` lon=${maskedLon}`;

    if (params.success) {
      this.logger.log(message);
    } else {
      this.logger.warn(message);
    }
  }

  private maskCoordinate(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded.toFixed(1)}~`;
  }
}
