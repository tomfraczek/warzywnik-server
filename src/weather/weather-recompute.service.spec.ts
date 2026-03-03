import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActionTaskSource,
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../common/enums/action.enums';
import { WarningCode, WarningScope } from '../common/enums/warning.enums';
import { ActionTask } from '../action-tasks/action-task.entity';
import { WeatherRecomputeService } from './weather-recompute.service';

describe('WeatherRecomputeService', () => {
  const makeService = (tasks: ActionTask[]) => {
    const em = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        locationLabel: 'Ogród przy domu',
      }),
      find: jest.fn(
        (
          _entity: unknown,
          where: { status: ActionTaskStatus | { $in: ActionTaskStatus[] } },
        ) => {
          const statuses =
            typeof where.status === 'string'
              ? [where.status]
              : where.status.$in;
          return tasks.filter((task) => statuses.includes(task.status));
        },
      ),
      count: jest.fn().mockResolvedValue(3),
    } as unknown as EntityManager;

    const service = new WeatherRecomputeService(
      em,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { service, em };
  };

  const allTasks = (): ActionTask[] => [
    {
      id: 't-weather-user-pending',
      title: 'Podlej',
      status: ActionTaskStatus.PENDING,
      source: ActionTaskSource.WEATHER_WARNING,
      targetType: ActionTaskTargetType.USER,
      dedupeKey: `weather:user:user-1:code:${WarningCode.DROUGHT_RISK_NEXT_7_DAYS}`,
      isManuallyRescheduled: false,
      dueAt: new Date('2026-02-27T10:00:00.000Z'),
      createdAt: new Date('2026-02-27T09:00:00.000Z'),
      user: { id: 'user-1' } as never,
    } as unknown as ActionTask,
    {
      id: 't-weather-bed-pending',
      title: 'Drenaż',
      status: ActionTaskStatus.PENDING,
      source: ActionTaskSource.WEATHER_WARNING,
      targetType: ActionTaskTargetType.BED,
      dedupeKey: `weather:user:user-1:bed:bed-1:code:${WarningCode.OVERWATERING_RISK}`,
      isManuallyRescheduled: false,
      dueAt: new Date('2026-02-27T11:00:00.000Z'),
      createdAt: new Date('2026-02-27T09:30:00.000Z'),
      user: { id: 'user-1' } as never,
      bed: { id: 'bed-1' } as never,
    } as unknown as ActionTask,
    {
      id: 't-weather-planting-pending',
      title: 'Osłoń wysiew',
      status: ActionTaskStatus.PENDING,
      source: ActionTaskSource.WEATHER_WARNING,
      targetType: ActionTaskTargetType.PLANTING,
      dedupeKey: `weather:user:user-1:planting:pl-1:code:${WarningCode.GERMINATION_TOO_COLD}`,
      isManuallyRescheduled: false,
      dueAt: new Date('2026-02-27T12:00:00.000Z'),
      createdAt: new Date('2026-02-27T10:00:00.000Z'),
      user: { id: 'user-1' } as never,
      planting: { id: 'pl-1' } as never,
      bed: { id: 'bed-2' } as never,
    } as unknown as ActionTask,
    {
      id: 't-manual-pending',
      title: 'Manual',
      status: ActionTaskStatus.PENDING,
      source: ActionTaskSource.MANUAL,
      targetType: ActionTaskTargetType.BED,
      isManuallyRescheduled: false,
      dueAt: new Date('2026-02-27T13:00:00.000Z'),
      createdAt: new Date('2026-02-27T10:30:00.000Z'),
      user: { id: 'user-1' } as never,
      bed: { id: 'bed-9' } as never,
    } as unknown as ActionTask,
    {
      id: 't-weather-user-done',
      title: 'Podlej historyczne',
      status: ActionTaskStatus.DONE,
      source: ActionTaskSource.WEATHER_WARNING,
      targetType: ActionTaskTargetType.USER,
      dedupeKey: `weather:user:user-1:code:${WarningCode.DROUGHT_RISK_NEXT_7_DAYS}`,
      isManuallyRescheduled: false,
      dueAt: new Date('2026-02-26T10:00:00.000Z'),
      createdAt: new Date('2026-02-26T09:00:00.000Z'),
      user: { id: 'user-1' } as never,
    } as unknown as ActionTask,
  ];

  it('returns pending only by default', async () => {
    const { service } = makeService(allTasks());

    const result = await service.getTasksResponse('user-1');

    expect(result.items.length).toBe(4);
    expect(
      result.items.every((item) => item.status === ActionTaskStatus.PENDING),
    ).toBe(true);
  });

  it('returns pending and done for status=all and maps weather scope meta', async () => {
    const { service, em } = makeService(allTasks());

    const result = await service.getTasksResponse('user-1', 'all');

    expect(result.items.length).toBe(5);

    const userWeather = result.items.find(
      (item) => item.id === 't-weather-user-pending',
    );
    expect(userWeather?.meta).toMatchObject({
      scope: WarningScope.USER,
      affectsAllBeds: true,
      affectedBedsCount: 3,
      locationLabel: 'Ogród przy domu',
      warningCode: WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
    });

    const bedWeather = result.items.find(
      (item) => item.id === 't-weather-bed-pending',
    );
    expect(bedWeather?.meta).toMatchObject({
      scope: WarningScope.BED,
      affectsAllBeds: false,
      affectedBedIds: ['bed-1'],
      warningCode: WarningCode.OVERWATERING_RISK,
    });

    const plantingWeather = result.items.find(
      (item) => item.id === 't-weather-planting-pending',
    );
    expect(plantingWeather?.meta).toMatchObject({
      scope: WarningScope.PLANTING,
      affectsAllBeds: false,
      affectedBedIds: ['bed-2'],
      warningCode: WarningCode.GERMINATION_TOO_COLD,
    });

    const manual = result.items.find((item) => item.id === 't-manual-pending');
    expect(manual?.meta).toBeNull();

    expect((em.count as unknown as jest.Mock).mock.calls.length).toBe(1);
  });
});
