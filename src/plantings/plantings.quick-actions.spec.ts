import { EntityManager } from '@mikro-orm/postgresql';
import { PlantingsService } from './plantings.service';
import { WarningsService } from '../warning-rules/warnings.service';
import { ActionAutomationService } from '../action-tasks/action-automation.service';
import { PlantingInsightsService } from '../planting-insights/planting-insights.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { User } from '../users/user.entity';
import { PlantingQuickActionKind } from '../common/enums/quick-action.enums';
import * as plantingSchemas from './dto/planting.schemas';

type QuickActionSchema = {
  safeParse: (input: unknown) => { success: boolean };
};

describe('PlantingsService quick actions', () => {
  const createService = () => {
    const em = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      flush: jest.fn(),
      persist: jest.fn(),
      persistAndFlush: jest.fn(),
      removeAndFlush: jest.fn(),
    } as unknown as EntityManager;

    const warningsService = {
      getRulesMap: jest.fn().mockResolvedValue(new Map()),
      buildWarnings: jest.fn().mockResolvedValue([]),
    } as unknown as WarningsService;

    const recomputeForPlanting = jest
      .fn()
      .mockResolvedValue({ desiredCount: 0 });

    const actionAutomationService = {
      recomputeForPlanting,
    } as unknown as ActionAutomationService;

    const recordEvent = jest.fn().mockResolvedValue(undefined);
    const plantingInsightsService = {
      recordEvent,
      buildSeasonSummary: jest.fn().mockResolvedValue(undefined),
    } as unknown as PlantingInsightsService;

    const analyticsService = {
      recordVegetableAddedToBed: jest.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsService;

    const service = new PlantingsService(
      em,
      warningsService,
      actionAutomationService,
      plantingInsightsService,
      analyticsService,
    );

    return { em, service, recordEvent, recomputeForPlanting };
  };

  it('records NOTE quick action and keeps lifecycle unchanged', async () => {
    const { em, service, recordEvent, recomputeForPlanting } = createService();
    const planting = {
      id: 'planting-1',
      status: 'IN_GROUND',
      bed: { id: 'bed-1' },
      vegetable: { id: 'veg-1' },
    };

    (em.findOne as jest.Mock).mockResolvedValue(planting);

    await (
      service as unknown as {
        createQuickAction: (
          user: User,
          plantingId: string,
          dto: {
            actionKind: PlantingQuickActionKind.NOTE;
            note: string;
          },
        ) => Promise<unknown>;
      }
    ).createQuickAction({ id: 'user-1' } as User, planting.id, {
      actionKind: PlantingQuickActionKind.NOTE,
      note: 'Notatka użytkownika',
    });

    const calls = recordEvent.mock.calls as unknown as Array<
      [
        {
          plantingId: string;
          payload: Record<string, unknown>;
        },
      ]
    >;
    const payload = calls[0][0].payload;

    expect(calls[0][0].plantingId).toBe('planting-1');
    expect(payload.actionKind).toBe(PlantingQuickActionKind.NOTE);
    expect(payload.scope).toBe('planting');
    expect(payload.decisionType).toBeNull();
    expect((payload.metadata as Record<string, unknown>).note).toBe(
      'Notatka użytkownika',
    );

    expect(planting.status).toBe('IN_GROUND');
    expect(recomputeForPlanting).toHaveBeenCalledWith({
      user: { id: 'user-1' },
      plantingId: 'planting-1',
      reason: 'PLANTING_QUICK_ACTION_NOTE',
    });
  });

  it('rejects HARVEST in planting quick action validation schema', () => {
    const createPlantingQuickActionSchema = (
      plantingSchemas as unknown as {
        createPlantingQuickActionSchema: QuickActionSchema;
      }
    ).createPlantingQuickActionSchema;

    const parsed = createPlantingQuickActionSchema.safeParse({
      actionKind: 'HARVEST',
      note: 'x',
    });

    expect(parsed.success).toBe(false);
  });

  it('requires note in planting quick action validation schema', () => {
    const createPlantingQuickActionSchema = (
      plantingSchemas as unknown as {
        createPlantingQuickActionSchema: QuickActionSchema;
      }
    ).createPlantingQuickActionSchema;

    const parsed = createPlantingQuickActionSchema.safeParse({
      actionKind: PlantingQuickActionKind.NOTE,
    });

    expect(parsed.success).toBe(false);
  });

  it('records NOTE quick action without decisionType override', async () => {
    const { em, service, recordEvent } = createService();
    (em.findOne as jest.Mock).mockResolvedValue({
      id: 'planting-1',
      status: 'IN_GROUND',
      bed: { id: 'bed-1' },
      vegetable: { id: 'veg-1' },
    });

    await (
      service as unknown as {
        createQuickAction: (
          user: User,
          plantingId: string,
          dto: { actionKind: PlantingQuickActionKind.NOTE; note: string },
        ) => Promise<unknown>;
      }
    ).createQuickAction({ id: 'user-1' } as User, 'planting-1', {
      actionKind: PlantingQuickActionKind.NOTE,
      note: 'Notatka użytkownika',
    });

    const calls = recordEvent.mock.calls as unknown as Array<
      [{ payload: Record<string, unknown> }]
    >;
    const payload = calls[0][0].payload;
    expect(payload.actionKind).toBe(PlantingQuickActionKind.NOTE);
    expect(payload.decisionType).toBeNull();
  });

  it('returns only planting-scoped quick-action notes for planting', async () => {
    const { em, service } = createService();
    (em.findOne as jest.Mock).mockResolvedValue({ id: 'planting-1' });
    (em.find as jest.Mock).mockResolvedValue([
      {
        id: 'e-1',
        eventTime: new Date('2026-05-06T10:00:00.000Z'),
        payload: {
          actionKind: 'NOTE',
          scope: 'planting',
          metadata: { note: 'Notatka uprawy' },
        },
      },
      {
        id: 'e-2',
        eventTime: new Date('2026-05-06T09:00:00.000Z'),
        payload: {
          actionKind: 'NOTE',
          scope: 'bed',
          metadata: { note: 'Notatka grządki' },
        },
      },
      {
        id: 'e-3',
        eventTime: new Date('2026-05-06T08:00:00.000Z'),
        payload: {
          actionKind: 'OTHER_ACTION',
          scope: 'planting',
          metadata: { note: 'to ma zostać pominięte' },
        },
      },
    ]);

    const result = await (
      service as unknown as {
        getQuickActionNotes: (
          user: User,
          plantingId: string,
        ) => Promise<{
          plantingId: string;
          items: Array<{
            id: string;
            note: string;
            scope: string;
            actionKind: string;
          }>;
        }>;
      }
    ).getQuickActionNotes({ id: 'user-1' } as User, 'planting-1');

    expect(result.plantingId).toBe('planting-1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'e-1',
        note: 'Notatka uprawy',
        scope: 'planting',
        actionKind: 'NOTE',
      }),
    );
  });
});
