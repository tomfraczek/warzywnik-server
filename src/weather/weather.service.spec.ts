import { EntityManager } from '@mikro-orm/postgresql';
import { ServiceUnavailableException } from '@nestjs/common';
import { User } from '../users/user.entity';
import { LocationEventsService } from '../locations/location-events.service';
import { WeatherService } from './weather.service';
import { OpenMeteoClient } from './open-meteo.client';
import {
  WeatherProvider,
  WeatherSnapshot,
  type WeatherSnapshotData,
} from './weather-snapshot.entity';

const createSnapshot = (expiresAt: Date): WeatherSnapshot => {
  const snapshot = new WeatherSnapshot();
  const data: WeatherSnapshotData = {
    timezone: 'Europe/Warsaw',
    current: {
      time: '2026-02-25T09:00:00.000Z',
      temp: 2,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 8,
      weatherCode: 3,
      isDay: true,
    },
    daily: [
      {
        date: '2026-02-25',
        tempMin: 1,
        tempMax: 8,
        precipSum: 2,
        windMax: 12,
        weatherCode: 61,
      },
    ],
    hourly: [
      {
        time: '2026-02-25T09:00',
        temp: 2,
        precip: 0,
        rain: 0,
        snow: 0,
        wind: 8,
        weatherCode: 3,
        isDay: true,
      },
    ],
  };

  snapshot.id = 'snapshot-1';
  snapshot.user = { id: 'user-1' } as User;
  snapshot.locationLat = 52.1;
  snapshot.locationLon = 21.1;
  snapshot.provider = WeatherProvider.OPEN_METEO;
  snapshot.fetchedAt = new Date('2026-02-25T09:00:00.000Z');
  snapshot.expiresAt = expiresAt;
  snapshot.isStale = false;
  snapshot.data = data;
  snapshot.dataVersion = 1;

  return snapshot;
};

describe('WeatherService', () => {
  it('returns stale fallback snapshot when provider fails and stale snapshot exists', async () => {
    const user = {
      id: 'user-1',
      locationLabel: 'Warsaw',
      locationLat: 52.1,
      locationLon: 21.1,
    } as User;

    const expiredSnapshot = createSnapshot(new Date(Date.now() - 60_000));

    const em = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(expiredSnapshot),
      flush: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    const client = {
      fetchForecast: jest
        .fn()
        .mockRejectedValue(new ServiceUnavailableException('provider error')),
    } as unknown as OpenMeteoClient;

    const events = {
      emitWeatherSnapshotUpdated: jest.fn(),
    } as unknown as LocationEventsService;

    const service = new WeatherService(em, client, events);

    const result = await service.getWeatherForUser(user.id);

    expect(result.stale).toBe(true);
    expect(result.location.label).toBe('Warsaw');
    expect(result.current.temp).toBe(2);
    expect(result.today.tempMax).toBe(8);
    expect(result.nextDays.length).toBe(0);
    expect(result.message).toContain('Zwracam ostatni dostępny snapshot');
  });

  it('throws 503 when provider fails and no snapshot exists', async () => {
    const user = {
      id: 'user-1',
      locationLabel: 'Warsaw',
      locationLat: 52.1,
      locationLon: 21.1,
    } as User;

    const em = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null),
      flush: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    const client = {
      fetchForecast: jest
        .fn()
        .mockRejectedValue(new ServiceUnavailableException('provider error')),
    } as unknown as OpenMeteoClient;

    const events = {
      emitWeatherSnapshotUpdated: jest.fn(),
    } as unknown as LocationEventsService;

    const service = new WeatherService(em, client, events);

    await expect(service.getWeatherForUser(user.id)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
