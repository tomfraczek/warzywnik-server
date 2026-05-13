import { WeatherController } from './weather.controller';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';
import { WeatherStatusService } from './weather-status.service';
import { WeatherStatusConfigService } from './weather-status-config.service';

const createWeatherStatusService = () =>
  new WeatherStatusService(new WeatherStatusConfigService());

const snapshotData = {
  timezone: 'Europe/Warsaw',
  current: {
    time: '2026-05-13T12:00',
    temp: 18,
    precip: 0,
    rain: 0,
    snow: 0,
    wind: 12,
    weatherCode: 3,
    isDay: true,
  },
  daily: [],
  hourly: [
    {
      time: '2026-05-13T12:00',
      temp: 18,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 12,
      weatherCode: 3,
      isDay: true,
    },
    {
      time: '2026-05-13T17:00',
      temp: 21,
      precip: 4,
      rain: 4,
      snow: 0,
      wind: 22,
      weatherCode: 95,
      isDay: true,
    },
    {
      time: '2026-05-13T18:00',
      temp: 19,
      precip: 3.5,
      rain: 3.5,
      snow: 0,
      wind: 24,
      weatherCode: 95,
      isDay: false,
    },
  ],
};

describe('WeatherController', () => {
  const req = { userEntity: { id: 'user-1' } } as never;

  it('returns near-term status and garden risk status in /weather response', async () => {
    const weatherService = {
      getWeatherForUser: jest.fn().mockResolvedValue({
        fetchedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        stale: false,
        location: { label: 'Ogród', lat: 50, lon: 20 },
        today: {},
        current: {},
        units: {},
        hourlyToday: [],
        nextDays: [],
      }),
      getLatestSnapshotDataForUser: jest.fn().mockResolvedValue(snapshotData),
    };

    const weatherRecomputeService = {
      getWarningsResponse: jest.fn().mockResolvedValue({
        computedAt: new Date().toISOString(),
        weatherBasis: 'FRESH',
        items: [
          {
            code: WarningCode.FROST_RISK_TODAY_NIGHT,
            severity: WarningSeverity.WARNING,
            title: 'Dziś w nocy: ryzyko przymrozku',
            message: 'Możliwy spadek temperatury do -1°C',
            validTo: new Date().toISOString(),
          },
        ],
      }),
      getTasksResponse: jest.fn(),
    };

    const controller = new WeatherController(
      weatherService as never,
      weatherRecomputeService as never,
      createWeatherStatusService(),
    );

    const result = await controller.getWeather(req);

    expect(result.status).toEqual(
      expect.objectContaining({
        code: 'THUNDERSTORM_LATER',
        severity: 'warning',
        source: 'hourly_forecast',
      }),
    );
    expect(result.gardenRiskStatus).toEqual(
      expect.objectContaining({
        code: 'FROST',
        severity: 'warning',
        source: 'warnings',
      }),
    );
  });

  it('returns CALM near-term status and OK garden risk when there are no warnings', async () => {
    const weatherService = {
      getWeatherForUser: jest.fn().mockResolvedValue({
        fetchedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        stale: false,
        location: { label: 'Ogród', lat: 50, lon: 20 },
        today: {},
        current: {},
        units: {},
        hourlyToday: [],
        nextDays: [],
      }),
      getLatestSnapshotDataForUser: jest.fn().mockResolvedValue({
        ...snapshotData,
        hourly: snapshotData.hourly.map((item) => ({
          ...item,
          precip: 0,
          rain: 0,
          wind: 10,
          weatherCode: 3,
        })),
      }),
    };

    const weatherRecomputeService = {
      getWarningsResponse: jest.fn().mockResolvedValue({
        computedAt: new Date().toISOString(),
        weatherBasis: 'FRESH',
        items: [],
      }),
      getTasksResponse: jest.fn(),
    };

    const controller = new WeatherController(
      weatherService as never,
      weatherRecomputeService as never,
      createWeatherStatusService(),
    );

    const result = await controller.getWeather(req);

    expect(result.status).toEqual(
      expect.objectContaining({
        code: 'CALM',
        severity: 'ok',
      }),
    );
    expect(result.gardenRiskStatus).toEqual(
      expect.objectContaining({
        code: 'OK',
        severity: 'ok',
      }),
    );
  });

  it('uses pending filter by default for /tasks', async () => {
    const weatherService = {};
    const weatherRecomputeService = {
      getTasksResponse: jest.fn().mockResolvedValue({
        computedAt: new Date().toISOString(),
        items: [],
      }),
    };

    const controller = new WeatherController(
      weatherService as never,
      weatherRecomputeService as never,
      createWeatherStatusService(),
    );

    await controller.getTasks(req, undefined, undefined);

    expect(weatherRecomputeService.getTasksResponse).toHaveBeenCalledWith(
      'user-1',
      'pending',
    );
  });

  it('maps includeDone=true to all filter for /tasks', async () => {
    const weatherService = {};
    const weatherRecomputeService = {
      getTasksResponse: jest.fn().mockResolvedValue({
        computedAt: new Date().toISOString(),
        items: [],
      }),
    };

    const controller = new WeatherController(
      weatherService as never,
      weatherRecomputeService as never,
      createWeatherStatusService(),
    );

    await controller.getTasks(req, undefined, 'true');

    expect(weatherRecomputeService.getTasksResponse).toHaveBeenCalledWith(
      'user-1',
      'all',
    );
  });

  it('prefers explicit status over includeDone', async () => {
    const weatherService = {};
    const weatherRecomputeService = {
      getTasksResponse: jest.fn().mockResolvedValue({
        computedAt: new Date().toISOString(),
        items: [],
      }),
    };

    const controller = new WeatherController(
      weatherService as never,
      weatherRecomputeService as never,
      createWeatherStatusService(),
    );

    await controller.getTasks(req, 'done', 'true');

    expect(weatherRecomputeService.getTasksResponse).toHaveBeenCalledWith(
      'user-1',
      'done',
    );
  });
});
