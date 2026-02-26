import {
  ActionTaskSource,
  ActionTaskStatus,
} from '../../common/enums/action.enums';
import { WarningCode, WarningScope } from '../../common/enums/warning.enums';
import { ActionTask } from '../../action-tasks/action-task.entity';
import { WarningInstance } from './warning-instance.entity';
import { WeatherTaskPlannerService } from './weather-task-planner.service';

describe('WeatherTaskPlannerService', () => {
  it('dedupes, updates and cancels weather tasks by dedupeKey', async () => {
    const tasks: ActionTask[] = [
      {
        id: 'task-1',
        user: { id: 'user-1' } as never,
        source: ActionTaskSource.WEATHER_WARNING,
        status: ActionTaskStatus.PENDING,
        dedupeKey: 'weather:user:user-1:code:FROST_RISK_NEXT_7_DAYS',
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
        code: WarningCode.FROST_RISK_NEXT_7_DAYS,
        dedupeKey: 'user:user-1:code:FROST_RISK_NEXT_7_DAYS',
        values: { riskDate: '2026-02-27' },
        details: null,
        validFrom: new Date('2026-02-26T10:00:00.000Z'),
        validTo: new Date('2026-02-27T23:59:59.000Z'),
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
    };

    const service = new WeatherTaskPlannerService(em as never);
    await service.recomputeWeatherTasksForUser('user-1');

    const updated = tasks.find(
      (item) =>
        item.dedupeKey === 'weather:user:user-1:code:FROST_RISK_NEXT_7_DAYS',
    );
    const canceled = tasks.find(
      (item) => item.dedupeKey === 'weather:user:user-1:code:TO_CANCEL',
    );

    expect(updated?.title).toBe('Okryj rośliny');
    expect(canceled?.status).toBe(ActionTaskStatus.CANCELED);
  });
});
