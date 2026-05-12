import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActionTaskSource,
  ActionTaskSourceType,
  ActionTaskStatus,
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
