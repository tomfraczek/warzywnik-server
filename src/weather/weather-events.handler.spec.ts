import { LocationEventsService } from '../locations/location-events.service';
import {
  LOCATION_UPDATED_EVENT,
  WEATHER_SNAPSHOT_UPDATED_EVENT,
} from '../locations/location-events.constants';
import { WeatherEventsHandler } from './weather-events.handler';
import { WeatherRecomputeService } from './weather-recompute.service';
import { WeatherService } from './weather.service';

describe('WeatherEventsHandler', () => {
  it('handles LOCATION_UPDATED by invalidating and refreshing snapshot', async () => {
    const listeners = new Map<string, (payload: unknown) => void>();
    const invalidateSnapshotForUser = jest.fn().mockResolvedValue(undefined);
    const refreshSnapshotForUser = jest.fn().mockResolvedValue(null);

    const locationEvents = {
      on: jest.fn((eventName: string, listener: (payload: unknown) => void) => {
        listeners.set(eventName, listener);
      }),
      off: jest.fn(),
    } as unknown as LocationEventsService;

    const weatherService = {
      invalidateSnapshotForUser,
      refreshSnapshotForUser,
    } as unknown as WeatherService;

    const recomputeService = {
      recomputeWarnings: jest.fn().mockResolvedValue(undefined),
      recomputeTasks: jest.fn().mockResolvedValue(undefined),
    } as unknown as WeatherRecomputeService;

    const handler = new WeatherEventsHandler(
      locationEvents,
      weatherService,
      recomputeService,
    );

    handler.onModuleInit();

    const listener = listeners.get(LOCATION_UPDATED_EVENT) as (
      payload: unknown,
    ) => void;

    listener({ userId: 'user-1' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(invalidateSnapshotForUser).toHaveBeenCalledWith('user-1');
    expect(refreshSnapshotForUser).toHaveBeenCalledWith({
      userId: 'user-1',
      reason: LOCATION_UPDATED_EVENT,
      force: true,
    });
  });

  it('handles WEATHER_SNAPSHOT_UPDATED by recomputing warnings and tasks', async () => {
    const listeners = new Map<string, (payload: unknown) => void>();
    const recomputeWarnings = jest.fn().mockResolvedValue(undefined);
    const recomputeTasks = jest.fn().mockResolvedValue(undefined);

    const locationEvents = {
      on: jest.fn((eventName: string, listener: (payload: unknown) => void) => {
        listeners.set(eventName, listener);
      }),
      off: jest.fn(),
    } as unknown as LocationEventsService;

    const weatherService = {
      invalidateSnapshotForUser: jest.fn().mockResolvedValue(undefined),
      refreshSnapshotForUser: jest.fn().mockResolvedValue(null),
    } as unknown as WeatherService;

    const recomputeService = {
      recomputeWarnings,
      recomputeTasks,
    } as unknown as WeatherRecomputeService;

    const handler = new WeatherEventsHandler(
      locationEvents,
      weatherService,
      recomputeService,
    );

    handler.onModuleInit();

    const listener = listeners.get(WEATHER_SNAPSHOT_UPDATED_EVENT) as (
      payload: unknown,
    ) => void;

    listener({ userId: 'user-1', stale: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(recomputeWarnings).toHaveBeenCalledWith('user-1', 'FRESH');
    expect(recomputeTasks).toHaveBeenCalledWith('user-1');
  });
});
