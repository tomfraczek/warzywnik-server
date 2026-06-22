import { EntityManager } from '@mikro-orm/postgresql';
import { PlantingsService } from './plantings.service';
import { PlanChecklistsService } from '../plan-checklists/plan-checklists.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

const premiumEntitlementsService = {
  isPremium: () => true,
  resolveSource: () => 'subscription',
  getEntitlements: jest.fn(),
  getLimits: jest.fn(),
} as unknown as EntitlementsService;
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { Planting } from './planting.entity';

describe('PlantingsService plan checklist triggers', () => {
  it('archives planting checklist when status moves from NEW', async () => {
    const planting = {
      id: 'planting-1',
      user: { id: 'user-1' },
      bed: { id: 'bed-1' },
      vegetable: {
        id: 'veg-1',
        rulesVersion: 1,
        recommendedSoils: { getItems: () => [] },
      },
      plannedStartDate: new Date('2026-03-10T00:00:00.000Z'),
      actualStartDate: null,
      startMethod: PlantingStartMethod.DIRECT_SOW,
      sowedAt: null,
      transplantedAt: null,
      harvestWindowStart: null,
      harvestWindowEnd: null,
      timelineTimezone: 'Europe/Warsaw',
      appliedRulesVersion: 1,
      status: PlantingStatus.NEW,
      notes: null,
      harvestResults: { getItems: () => [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Planting;

    const em = {
      findOne: jest.fn().mockResolvedValue(planting),
      populate: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    const actionAutomationService = {
      recomputeForPlanting: jest.fn().mockResolvedValue({ desiredCount: 0 }),
    } as never;

    const warningsService = {
      getRulesMap: jest.fn().mockResolvedValue(new Map()),
      buildWarnings: jest.fn().mockResolvedValue([]),
    } as never;

    const plantingInsightsService = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
      buildSeasonSummary: jest.fn().mockResolvedValue(undefined),
    } as never;

    const analyticsService = {} as never;

    const archiveItemsForStartedPlanting = jest
      .fn()
      .mockResolvedValue(undefined);
    const recomputeForBed = jest.fn().mockResolvedValue(undefined);
    const planChecklistsService = {
      archiveItemsForStartedPlanting,
      recomputeForBed,
    } as unknown as PlanChecklistsService;

    const service = new PlantingsService(
      em,
      warningsService,
      actionAutomationService,
      plantingInsightsService,
      analyticsService,
      premiumEntitlementsService,
      planChecklistsService,
    );

    jest
      .spyOn(
        service as unknown as {
          serializeWithComputed: () => Promise<Record<string, unknown>>;
        },
        'serializeWithComputed',
      )
      .mockResolvedValue({});

    await service.update({ id: 'user-1' } as never, planting.id, {
      status: PlantingStatus.IN_GROUND,
    });

    expect(archiveItemsForStartedPlanting).toHaveBeenCalledWith({
      user: { id: 'user-1' },
      plantingId: planting.id,
      reason: 'planting_started',
    });

    expect(recomputeForBed).toHaveBeenCalledWith({
      user: { id: 'user-1' },
      bedId: 'bed-1',
      reason: 'PLANTING_NEW_UPDATED',
    });
  });
});
