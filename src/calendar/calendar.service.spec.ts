import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActionTaskOwnerScopeType,
  ActionTaskSource,
  ActionTaskSourceType,
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../common/enums/action.enums';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  it('maps task source from ActionTask.source/sourceType (without sourceRefId heuristic)', async () => {
    const em = {
      find: jest.fn((entity: unknown) => {
        const name = (entity as { name?: string }).name;

        if (name === 'ActionTask') {
          return [
            {
              id: 'task-weather',
              status: ActionTaskStatus.PENDING,
              dueAt: new Date('2026-05-11T09:00:00.000Z'),
              source: ActionTaskSource.WEATHER_WARNING,
              sourceType: ActionTaskSourceType.AUTOMATION,
              sourceRefId: null,
              title: 'Pogoda',
              bed: null,
              planting: null,
              actionTemplate: null,
            },
            {
              id: 'task-manual',
              status: ActionTaskStatus.PENDING,
              dueAt: new Date('2026-05-11T10:00:00.000Z'),
              source: ActionTaskSource.MANUAL,
              sourceType: ActionTaskSourceType.MANUAL,
              sourceRefId: null,
              title: 'Manual',
              bed: null,
              planting: null,
              actionTemplate: null,
            },
          ];
        }

        return [];
      }),
    } as unknown as EntityManager;

    const service = new CalendarService(em);

    const result = await service.getCalendar(
      { id: 'user-1', timezone: 'UTC' } as never,
      {
        from: '2026-05-11',
        to: '2026-05-11',
        includeDoneTasks: false,
        includeReminders: false,
      },
    );

    const weatherTask = result.tasks.find((item) => item.id === 'task-weather');
    const manualTask = result.tasks.find((item) => item.id === 'task-manual');

    expect(weatherTask?.source).toBe(ActionTaskSource.WEATHER_WARNING);
    expect(weatherTask?.sourceType).toBe(ActionTaskSourceType.AUTOMATION);
    expect(manualTask?.source).toBe(ActionTaskSource.MANUAL);
    expect(manualTask?.sourceType).toBe(ActionTaskSourceType.MANUAL);
  });
});

describe('CalendarService — task ownership fields in response', () => {
  function makeEm(tasks: object[]) {
    return {
      find: jest.fn((entity: unknown) => {
        const name = (entity as { name?: string }).name;
        if (name === 'ActionTask') return Promise.resolve(tasks);
        return Promise.resolve([]);
      }),
    } as unknown as EntityManager;
  }

  const baseDate = new Date('2026-05-11T09:00:00.000Z');
  const baseQuery = {
    from: '2026-05-11',
    to: '2026-05-11',
    includeDoneTasks: false,
    includeReminders: false,
  };
  const baseUser = { id: 'user-1', timezone: 'UTC' } as never;

  it('direct planting task has relationType=direct and affectedPlantingIds=null', async () => {
    const task = {
      id: 'task-planting',
      status: ActionTaskStatus.PENDING,
      dueAt: baseDate,
      source: ActionTaskSource.MANUAL,
      sourceType: ActionTaskSourceType.MANUAL,
      sourceRefId: null,
      title: 'Podlewanie uprawy',
      targetType: ActionTaskTargetType.PLANTING,
      ownerScopeType: ActionTaskOwnerScopeType.PLANTING,
      ownerScopeId: 'planting-1',
      bed: null,
      planting: { id: 'planting-1' },
      growingSpace: null,
      metadata: null,
      actionTemplate: null,
    };

    const service = new CalendarService(makeEm([task]));
    const result = await service.getCalendar(baseUser, baseQuery);

    const found = result.tasks.find((t) => t.id === 'task-planting');
    expect(found?.ownerScopeType).toBe(ActionTaskOwnerScopeType.PLANTING);
    expect(found?.ownerScopeId).toBe('planting-1');
    expect(found?.plantingId).toBe('planting-1');
    expect(found?.relationType).toBe('direct');
    expect(found?.affectedPlantingIds).toBeNull();
  });

  it('aggregated bed task has relationType=bed and affectedPlantingIds array', async () => {
    const task = {
      id: 'task-bed',
      status: ActionTaskStatus.PENDING,
      dueAt: baseDate,
      source: ActionTaskSource.WEATHER_WARNING,
      sourceType: ActionTaskSourceType.AUTOMATION,
      sourceRefId: null,
      title: 'Podlewanie grządki',
      targetType: ActionTaskTargetType.BED,
      ownerScopeType: ActionTaskOwnerScopeType.BED,
      ownerScopeId: 'bed-1',
      bed: { id: 'bed-1' },
      planting: null,
      growingSpace: null,
      metadata: { affectedPlantingIds: ['p-1', 'p-2'] },
      actionTemplate: null,
    };

    const service = new CalendarService(makeEm([task]));
    const result = await service.getCalendar(baseUser, baseQuery);

    const found = result.tasks.find((t) => t.id === 'task-bed');
    expect(found?.ownerScopeType).toBe(ActionTaskOwnerScopeType.BED);
    expect(found?.ownerScopeId).toBe('bed-1');
    expect(found?.bedId).toBe('bed-1');
    expect(found?.relationType).toBe('bed');
    expect(found?.affectedPlantingIds).toEqual(['p-1', 'p-2']);
  });

  it('greenhouse warning task is not generated — ownerScopeType=null yields relationType=null', async () => {
    // Greenhouse warnings are excluded from OPERATIONAL_TASK_CODES (Fallback B).
    // If somehow a legacy task exists with no ownerScopeType, calendar must still respond correctly.
    const task = {
      id: 'task-legacy-no-scope',
      status: ActionTaskStatus.PENDING,
      dueAt: baseDate,
      source: ActionTaskSource.WEATHER_WARNING,
      sourceType: ActionTaskSourceType.AUTOMATION,
      sourceRefId: null,
      title: 'Legacy task',
      targetType: ActionTaskTargetType.BED,
      ownerScopeType: null,
      ownerScopeId: null,
      bed: { id: 'bed-1' },
      planting: null,
      growingSpace: null,
      metadata: null,
      actionTemplate: null,
    };

    const service = new CalendarService(makeEm([task]));
    const result = await service.getCalendar(baseUser, baseQuery);

    const found = result.tasks.find((t) => t.id === 'task-legacy-no-scope');
    expect(found?.ownerScopeType).toBeNull();
    expect(found?.relationType).toBeNull();
    expect(found?.affectedPlantingIds).toBeNull();
  });
});
