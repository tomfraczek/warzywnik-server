import {
  ActionTaskSource,
  ActionTaskStatus,
} from '../../common/enums/action.enums';
import { WarningCode, WarningScope } from '../../common/enums/warning.enums';
import { ActionTask } from '../../action-tasks/action-task.entity';
import { WarningInstance } from './warning-instance.entity';
import { WeatherTaskPlannerService } from './weather-task-planner.service';
import { PlantingEventType } from '../../common/enums/planting-event.enums';
import { PlantingEvent } from '../../planting-insights/planting-event.entity';

describe('WeatherTaskPlannerService', () => {
  it('skips planning when automatic tasks are disabled for user', async () => {
    const em = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'user-1', automaticTasksEnabled: false }),
      find: jest.fn(),
      transactional: jest.fn(),
      fork: jest.fn(function (this: unknown) {
        return this;
      }),
    };

    const service = new WeatherTaskPlannerService(em as never, { publishTaskEvents: jest.fn() } as never);
    await service.recomputeWeatherTasksForUser('user-1');

    expect(em.find).not.toHaveBeenCalled();
    expect(em.transactional).not.toHaveBeenCalled();
  });

  it('creates tasks only from operational warnings for today/tomorrow', async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const farFuture = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const tasks: ActionTask[] = [
      {
        id: 'task-1',
        user: { id: 'user-1' } as never,
        source: ActionTaskSource.WEATHER_WARNING,
        status: ActionTaskStatus.PENDING,
        dedupeKey: `weather:FROST_RISK_TODAY_NIGHT:user-1:${today}`,
        title: 'old title',
      } as unknown as ActionTask,
      {
        id: 'task-2',
        user: { id: 'user-1' } as never,
        source: ActionTaskSource.WEATHER_WARNING,
        status: ActionTaskStatus.PENDING,
        dedupeKey: 'weather:user:user-1:code:TO_CANCEL',
        title: 'to cancel',
      } as unknown as ActionTask,
    ];

    const warnings: WarningInstance[] = [
      {
        id: 'w-1',
        user: { id: 'user-1' } as never,
        scope: WarningScope.USER,
        code: WarningCode.FROST_RISK_TODAY_NIGHT,
        dedupeKey: `user:user-1:code:FROST_RISK_TODAY_NIGHT:date:${today}`,
        values: {},
        details: { localDate: today },
        validFrom: new Date('2026-02-26T10:00:00.000Z'),
        validTo: new Date('2026-02-27T23:59:59.000Z'),
        isActive: true,
      } as unknown as WarningInstance,
      {
        id: 'w-2',
        user: { id: 'user-1' } as never,
        scope: WarningScope.USER,
        code: WarningCode.FROST_RISK_NEXT_7_DAYS,
        dedupeKey: 'user:user-1:code:FROST_RISK_NEXT_7_DAYS',
        values: {},
        details: { localDate: farFuture },
        validFrom: new Date('2026-03-03T10:00:00.000Z'),
        validTo: new Date('2026-03-03T23:59:59.000Z'),
        isActive: true,
      } as unknown as WarningInstance,
      {
        id: 'w-3',
        user: { id: 'user-1' } as never,
        scope: WarningScope.USER,
        code: WarningCode.WATERING_NEEDED_TOMORROW,
        dedupeKey: `user:user-1:code:WATERING_NEEDED_TOMORROW:date:${tomorrow}`,
        values: {},
        details: { localDate: tomorrow },
        validFrom: new Date('2026-02-27T08:00:00.000Z'),
        validTo: new Date('2026-02-27T23:59:59.000Z'),
        isActive: true,
      } as unknown as WarningInstance,
      {
        id: 'w-4',
        user: { id: 'user-1' } as never,
        scope: WarningScope.USER,
        code: WarningCode.WATERING_NEEDED_TOMORROW,
        dedupeKey: `user:user-1:code:WATERING_NEEDED_TOMORROW:date:${farFuture}`,
        values: {},
        details: { localDate: farFuture },
        validFrom: new Date('2026-03-01T08:00:00.000Z'),
        validTo: new Date('2026-03-01T23:59:59.000Z'),
        isActive: true,
      } as unknown as WarningInstance,
    ];

    const em = {
      findOne: jest.fn((_entity: unknown, where: Record<string, unknown>) => {
        if (where.id === 'user-1') return { id: 'user-1' };
        return null;
      }),
      find: jest.fn((entity: unknown) => {
        if ((entity as { name?: string }).name === 'WarningInstance') {
          return warnings;
        }
        return tasks;
      }),
      transactional: jest.fn((cb: (arg: unknown) => Promise<void>) => cb(em)),
      getReference: jest.fn((cls: unknown, id: string) => ({ id })),
      persist: jest.fn((entity: ActionTask) => {
        if (!entity.id) {
          entity.id = `task-${tasks.length + 1}`;
          tasks.push(entity);
        }
      }),
      flush: jest.fn(() => Promise.resolve(undefined)),
      fork: jest.fn(function (this: unknown) {
        return this;
      }),
    };

    const service = new WeatherTaskPlannerService(em as never, { publishTaskEvents: jest.fn() } as never);
    await service.recomputeWeatherTasksForUser('user-1');

    const updated = tasks.find(
      (item) =>
        item.dedupeKey === `weather:FROST_RISK_TODAY_NIGHT:user-1:${today}`,
    );
    const canceled = tasks.find(
      (item) => item.dedupeKey === 'weather:user:user-1:code:TO_CANCEL',
    );
    const wateringTomorrow = tasks.find((item) =>
      item.dedupeKey?.startsWith(
        `weather:WATERING_NEEDED_TOMORROW:user-1:${tomorrow}`,
      ),
    );
    const farFutureTask = tasks.find((item) =>
      item.dedupeKey?.startsWith(
        `weather:WATERING_NEEDED_TOMORROW:user-1:${farFuture}`,
      ),
    );

    expect(updated?.title).toBe('Zabezpiecz rośliny na noc');
    expect(canceled?.status).toBe(ActionTaskStatus.CANCELED);
    expect(wateringTomorrow).toBeDefined();
    expect(farFutureTask).toBeUndefined();
  });

  it('does not duplicate weather task when similar action was completed recently', async () => {
    const now = new Date('2026-05-05T08:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const today = now.toISOString().slice(0, 10);
    const tasks: ActionTask[] = [];

    const warnings: WarningInstance[] = [
      {
        id: 'w-1',
        user: { id: 'user-1' } as never,
        scope: WarningScope.PLANTING,
        code: WarningCode.WATERING_NEEDED_TODAY,
        dedupeKey: `user:user-1:code:WATERING_NEEDED_TODAY:date:${today}:planting:p-1`,
        values: {},
        details: { localDate: today },
        validFrom: now,
        validTo: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        isActive: true,
        planting: { id: 'p-1' } as never,
      } as unknown as WarningInstance,
    ];

    const events: PlantingEvent[] = [
      {
        eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
        eventTime: new Date('2026-05-05T06:00:00.000Z'),
        planting: { id: 'p-1' } as never,
        payload: { decisionType: 'WATERING' },
      } as never,
    ];

    const em = {
      findOne: jest.fn((_entity: unknown, where: Record<string, unknown>) => {
        if (where.id === 'user-1') return { id: 'user-1' };
        return null;
      }),
      find: jest.fn((entity: unknown) => {
        const name = (entity as { name?: string }).name;
        if (name === 'WarningInstance') return warnings;
        if (name === 'ActionTask') return tasks;
        if (name === 'PlantingEvent') return events;
        return [];
      }),
      transactional: jest.fn((cb: (arg: unknown) => Promise<void>) => cb(em)),
      getReference: jest.fn((cls: unknown, id: string) => ({ id })),
      persist: jest.fn((entity: ActionTask) => {
        tasks.push(entity);
      }),
      flush: jest.fn(() => Promise.resolve(undefined)),
      fork: jest.fn(function (this: unknown) {
        return this;
      }),
    };

    const service = new WeatherTaskPlannerService(em as never, { publishTaskEvents: jest.fn() } as never);
    await service.recomputeWeatherTasksForUser('user-1');

    expect(tasks).toHaveLength(0);

    jest.useRealTimers();
  });
});
