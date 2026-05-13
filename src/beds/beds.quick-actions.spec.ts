import { EntityManager } from '@mikro-orm/postgresql';
import { BedsService } from './beds.service';
import { WeatherRecomputeService } from '../weather/weather-recompute.service';
import { PlantingInsightsService } from '../planting-insights/planting-insights.service';
import { ActionAutomationService } from '../action-tasks/action-automation.service';
import { ActionTask } from '../action-tasks/action-task.entity';
import { User } from '../users/user.entity';
import { BedQuickActionKind } from '../common/enums/quick-action.enums';

describe('BedsService quick actions', () => {
  it('records bed WATERING as timeline events and recomputes plantings', async () => {
    const em = {
      findOne: jest.fn().mockResolvedValue({ id: 'bed-1' }),
      find: jest.fn().mockResolvedValue([
        { id: 'p-1', vegetable: { id: 'veg-1' } },
        { id: 'p-2', vegetable: { id: 'veg-2' } },
      ]),
    } as unknown as EntityManager;

    const weatherRecomputeService = {
      recomputeWarnings: jest.fn(),
      recomputeTasks: jest.fn(),
    } as unknown as WeatherRecomputeService;

    const recordEvent = jest.fn().mockResolvedValue(undefined);
    const plantingInsightsService = {
      recordEvent,
    } as unknown as PlantingInsightsService;

    const recomputeForPlanting = jest
      .fn()
      .mockResolvedValue({ desiredCount: 0 });
    const actionAutomationService = {
      recomputeForPlanting,
    } as unknown as ActionAutomationService;

    const service = new BedsService(
      em,
      weatherRecomputeService,
      plantingInsightsService,
      actionAutomationService,
    );

    const occurredAt = '2026-05-06T09:00:00.000Z';
    const result = await (
      service as unknown as {
        createQuickAction: (
          user: User,
          bedId: string,
          dto: { actionKind: BedQuickActionKind; occurredAt?: string },
        ) => Promise<{
          bedId: string;
          actionKind: BedQuickActionKind;
          occurredAt: Date;
          eventsRecorded: number;
          recomputedPlantingIds: string[];
        }>;
      }
    ).createQuickAction({ id: 'user-1' } as User, 'bed-1', {
      actionKind: BedQuickActionKind.WATERING,
      occurredAt,
    });

    expect(recordEvent).toHaveBeenCalledTimes(2);
    const recordEventCalls = recordEvent.mock.calls as unknown as Array<
      [
        {
          plantingId: string;
          bedId: string;
          payload: Record<string, unknown>;
        },
      ]
    >;
    const firstEventArg = recordEventCalls[0][0];

    expect(firstEventArg.plantingId).toBe('p-1');
    expect(firstEventArg.bedId).toBe('bed-1');
    expect(firstEventArg.payload.actionKind).toBe(BedQuickActionKind.WATERING);
    expect(firstEventArg.payload.scope).toBe('bed');
    expect(firstEventArg.payload.decisionType).toBe('WATERING');

    expect(recomputeForPlanting).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        bedId: 'bed-1',
        actionKind: BedQuickActionKind.WATERING,
        eventsRecorded: 2,
        recomputedPlantingIds: ['p-1', 'p-2'],
      }),
    );
    expect((result as { occurredAt: Date }).occurredAt.toISOString()).toBe(
      occurredAt,
    );
  });

  it('returns deduped NOTE quick-action entries for bed', async () => {
    const em = {
      findOne: jest.fn().mockResolvedValue({ id: 'bed-1' }),
      find: jest.fn().mockResolvedValue([
        {
          id: 'e-1',
          eventTime: new Date('2026-05-06T09:00:00.000Z'),
          planting: { id: 'p-1' },
          payload: {
            actionKind: 'NOTE',
            scope: 'bed',
            metadata: { note: 'Sprawdzić wilgotność jutro' },
          },
        },
        {
          id: 'e-2',
          eventTime: new Date('2026-05-06T09:00:00.000Z'),
          planting: { id: 'p-2' },
          payload: {
            actionKind: 'NOTE',
            scope: 'bed',
            metadata: { note: 'Sprawdzić wilgotność jutro' },
          },
        },
        {
          id: 'e-3',
          eventTime: new Date('2026-05-05T09:00:00.000Z'),
          planting: { id: 'p-1' },
          payload: {
            actionKind: 'WATERING',
            scope: 'bed',
            metadata: { note: 'to ma zostać pominięte' },
          },
        },
      ]),
    } as unknown as EntityManager;

    const weatherRecomputeService = {
      recomputeWarnings: jest.fn(),
      recomputeTasks: jest.fn(),
    } as unknown as WeatherRecomputeService;

    const plantingInsightsService = {
      recordEvent: jest.fn(),
    } as unknown as PlantingInsightsService;

    const actionAutomationService = {
      recomputeForPlanting: jest.fn(),
    } as unknown as ActionAutomationService;

    const service = new BedsService(
      em,
      weatherRecomputeService,
      plantingInsightsService,
      actionAutomationService,
    );

    const result = await (
      service as unknown as {
        getQuickActionNotes: (
          user: User,
          bedId: string,
        ) => Promise<{
          bedId: string;
          items: Array<{
            note: string;
            scope: string;
            actionKind: string;
            plantingIds: string[];
          }>;
        }>;
      }
    ).getQuickActionNotes({ id: 'user-1' } as User, 'bed-1');

    expect(result.bedId).toBe('bed-1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        note: 'Sprawdzić wilgotność jutro',
        scope: 'bed',
        actionKind: 'NOTE',
      }),
    );
    expect(result.items[0].plantingIds.sort()).toEqual(['p-1', 'p-2']);
  });

  it('detaches linked action tasks before physical bed delete', async () => {
    const txEm = {
      findOne: jest.fn().mockResolvedValue({ id: 'bed-1' }),
      find: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'pl-1' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      flush: jest.fn().mockResolvedValue(undefined),
      nativeUpdate: jest.fn().mockResolvedValue(1),
      nativeDelete: jest.fn().mockResolvedValue(0),
      removeAndFlush: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    const em = {
      transactional: jest
        .fn()
        .mockImplementation(
          async (handler: (innerEm: EntityManager) => Promise<void>) =>
            handler(txEm),
        ),
    } as unknown as EntityManager;

    const weatherRecomputeService = {
      recomputeWarnings: jest.fn(),
      recomputeTasks: jest.fn(),
    } as unknown as WeatherRecomputeService;

    const plantingInsightsService = {
      recordEvent: jest.fn(),
    } as unknown as PlantingInsightsService;

    const actionAutomationService = {
      recomputeForPlanting: jest.fn(),
    } as unknown as ActionAutomationService;

    const service = new BedsService(
      em,
      weatherRecomputeService,
      plantingInsightsService,
      actionAutomationService,
    );

    await (
      service as unknown as {
        remove: (user: User, bedId: string) => Promise<void>;
      }
    ).remove({ id: 'user-1' } as User, 'bed-1');

    expect(txEm.nativeUpdate).toHaveBeenCalledWith(
      ActionTask,
      {
        user: 'user-1',
        $or: [{ bed: 'bed-1' }, { planting: { $in: ['pl-1'] } }],
      },
      {
        bed: null,
        planting: null,
      },
    );

    expect(txEm.removeAndFlush).toHaveBeenCalledWith({ id: 'bed-1' });
    expect(
      (txEm.nativeUpdate as unknown as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (txEm.removeAndFlush as unknown as jest.Mock).mock.invocationCallOrder[0],
    );
  });
});
