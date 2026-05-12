import { WeatherController } from './weather.controller';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';

describe('WeatherController', () => {
  const req = { userEntity: { id: 'user-1' } } as never;

  it('returns summary status for frost in /weather response', async () => {
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
    );

    const result = await controller.getWeather(req);

    expect(result.status).toEqual(
      expect.objectContaining({
        code: 'FROST',
        level: 'warning',
      }),
    );
  });

  it('returns OK status when there are no warnings', async () => {
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
    );

    const result = await controller.getWeather(req);

    expect(result.status).toEqual(
      expect.objectContaining({
        code: 'OK',
        level: 'ok',
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
    );

    await controller.getTasks(req, 'done', 'true');

    expect(weatherRecomputeService.getTasksResponse).toHaveBeenCalledWith(
      'user-1',
      'done',
    );
  });
});
