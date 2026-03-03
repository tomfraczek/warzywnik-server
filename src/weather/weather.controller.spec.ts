import { WeatherController } from './weather.controller';

describe('WeatherController', () => {
  const req = { userEntity: { id: 'user-1' } } as never;

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
