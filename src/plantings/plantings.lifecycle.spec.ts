import { EntityManager } from '@mikro-orm/postgresql';
import { PlantingsService } from './plantings.service';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { ActionAutomationService } from '../action-tasks/action-automation.service';
import { WarningsService } from '../warning-rules/warnings.service';
import { PlantingInsightsService } from '../planting-insights/planting-insights.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Planting } from './planting.entity';
import { Bed } from '../beds/bed.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { PlantingEventType } from '../common/enums/planting-event.enums';
import { User } from '../users/user.entity';

describe('PlantingsService transplant lifecycle', () => {
  type EmMock = {
    findOne: jest.Mock<Promise<unknown>, [unknown, unknown?]>;
    persistAndFlush: jest.Mock<Promise<void>, [Planting]>;
    flush: jest.Mock<Promise<void>, []>;
    populate: jest.Mock<Promise<void>, [unknown, unknown?]>;
  };

  const createDeps = () => {
    const em: EmMock = {
      findOne: jest.fn<Promise<unknown>, [unknown, unknown?]>(),
      persistAndFlush: jest
        .fn<Promise<void>, [Planting]>()
        .mockResolvedValue(undefined),
      flush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      populate: jest
        .fn<Promise<void>, [unknown, unknown?]>()
        .mockResolvedValue(undefined),
    };

    const warningsService = {
      getRulesMap: jest.fn().mockResolvedValue(new Map()),
      buildWarnings: jest.fn().mockResolvedValue([]),
    } as unknown as WarningsService;

    const actionAutomationService = {
      recomputeForPlanting: jest.fn().mockResolvedValue({ desiredCount: 1 }),
    } as unknown as ActionAutomationService;

    const plantingInsightsService = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
      buildSeasonSummary: jest.fn().mockResolvedValue(undefined),
    } as unknown as PlantingInsightsService;

    const analyticsService = {
      recordVegetableAddedToBed: jest.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsService;

    const service = new PlantingsService(
      em as unknown as EntityManager,
      warningsService,
      actionAutomationService,
      plantingInsightsService,
      analyticsService,
    );

    jest
      .spyOn(
        service as unknown as {
          serializeWithComputed: () => Promise<Record<string, unknown>>;
        },
        'serializeWithComputed',
      )
      .mockResolvedValue({});

    return {
      service,
      em,
      actionAutomationService: actionAutomationService as unknown as {
        recomputeForPlanting: jest.Mock;
      },
      plantingInsightsService: plantingInsightsService as unknown as {
        recordEvent: jest.Mock;
      },
    };
  };

  const user = { id: 'user-1' } as User;

  const makeBed = (): Bed =>
    ({
      id: 'bed-1',
      name: 'Bed 1',
    }) as Bed;

  const makeVegetable = (): Vegetable =>
    ({
      id: 'veg-1',
      name: 'Tomato',
      slug: 'tomato',
      rulesVersion: 1,
    }) as Vegetable;

  it('sets transplantedAt to now on TRANSPLANT -> IN_GROUND update without transplantedAt', async () => {
    const { service, em } = createDeps();
    const planting = {
      id: 'planting-1',
      user,
      bed: makeBed(),
      vegetable: makeVegetable(),
      plannedStartDate: new Date('2026-03-01T10:00:00.000Z'),
      actualStartDate: null,
      startMethod: PlantingStartMethod.TRANSPLANT,
      sowedAt: null,
      transplantedAt: null,
      harvestWindowStart: null,
      harvestWindowEnd: null,
      timelineTimezone: 'Europe/Warsaw',
      appliedRulesVersion: 1,
      status: PlantingStatus.SEEDLING_READY_FOR_TRANSPLANT,
      notes: null,
      harvestResults: { getItems: () => [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Planting;

    em.findOne.mockResolvedValue(planting);

    const before = Date.now();
    await service.update(user, planting.id, {
      status: PlantingStatus.IN_GROUND,
    });
    const after = Date.now();

    expect(planting.transplantedAt).toBeInstanceOf(Date);
    expect((planting.transplantedAt as Date).getTime()).toBeGreaterThanOrEqual(
      before,
    );
    expect((planting.transplantedAt as Date).getTime()).toBeLessThanOrEqual(
      after,
    );
  });

  it('keeps DTO transplantedAt on TRANSPLANT -> IN_GROUND update', async () => {
    const { service, em } = createDeps();
    const planting = {
      id: 'planting-2',
      user,
      bed: makeBed(),
      vegetable: makeVegetable(),
      plannedStartDate: new Date('2026-03-01T10:00:00.000Z'),
      actualStartDate: null,
      startMethod: PlantingStartMethod.TRANSPLANT,
      sowedAt: null,
      transplantedAt: null,
      harvestWindowStart: null,
      harvestWindowEnd: null,
      timelineTimezone: 'Europe/Warsaw',
      appliedRulesVersion: 1,
      status: PlantingStatus.SEEDLING_READY_FOR_TRANSPLANT,
      notes: null,
      harvestResults: { getItems: () => [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Planting;

    em.findOne.mockResolvedValue(planting);

    const dtoTransplantedAt = '2026-04-15T09:30:00.000Z';
    await service.update(user, planting.id, {
      status: PlantingStatus.IN_GROUND,
      transplantedAt: dtoTransplantedAt,
    });

    expect(planting.transplantedAt?.toISOString()).toBe(dtoTransplantedAt);
  });

  it('sets transplantedAt to now when creating TRANSPLANT planting directly in IN_GROUND without transplantedAt', async () => {
    const { service, em, actionAutomationService } = createDeps();
    const bed = makeBed();
    const vegetable = makeVegetable();

    em.findOne.mockImplementation((entity: unknown) => {
      if (entity === Bed) return Promise.resolve(bed);
      if (entity === Vegetable) return Promise.resolve(vegetable);
      return Promise.resolve(null);
    });

    const before = Date.now();
    await service.create(user, {
      bedId: bed.id,
      vegetableId: vegetable.id,
      startMethod: PlantingStartMethod.TRANSPLANT,
      status: PlantingStatus.IN_GROUND,
      plannedStartDate: '2026-03-10T12:00:00.000Z',
    });
    const after = Date.now();

    const persisted = em.persistAndFlush.mock.calls[0]?.[0];
    expect(persisted).toBeDefined();
    if (!persisted) {
      throw new Error('Persisted planting was not captured');
    }
    expect(persisted.transplantedAt).toBeInstanceOf(Date);
    expect(persisted.actualStartDate).toBeInstanceOf(Date);
    expect((persisted.transplantedAt as Date).getTime()).toBeGreaterThanOrEqual(
      before,
    );
    expect((persisted.transplantedAt as Date).getTime()).toBeLessThanOrEqual(
      after,
    );
    expect(actionAutomationService.recomputeForPlanting).toHaveBeenCalledWith({
      user,
      plantingId: persisted.id,
      reason: 'PLANTING_CREATED',
    });
  });

  it('sets sowedAt to now when creating DIRECT_SOW planting directly in IN_GROUND without sowedAt', async () => {
    const { service, em, actionAutomationService } = createDeps();
    const bed = makeBed();
    const vegetable = makeVegetable();

    em.findOne.mockImplementation((entity: unknown) => {
      if (entity === Bed) return Promise.resolve(bed);
      if (entity === Vegetable) return Promise.resolve(vegetable);
      return Promise.resolve(null);
    });

    const before = Date.now();
    await service.create(user, {
      bedId: bed.id,
      vegetableId: vegetable.id,
      startMethod: PlantingStartMethod.DIRECT_SOW,
      status: PlantingStatus.IN_GROUND,
      plannedStartDate: '2026-03-10T12:00:00.000Z',
    });
    const after = Date.now();

    const persisted = em.persistAndFlush.mock.calls[0]?.[0];
    expect(persisted).toBeDefined();
    if (!persisted) {
      throw new Error('Persisted planting was not captured');
    }
    expect(persisted.sowedAt).toBeInstanceOf(Date);
    expect(persisted.actualStartDate).toBeInstanceOf(Date);
    expect((persisted.sowedAt as Date).getTime()).toBeGreaterThanOrEqual(
      before,
    );
    expect((persisted.sowedAt as Date).getTime()).toBeLessThanOrEqual(after);
    expect(actionAutomationService.recomputeForPlanting).toHaveBeenCalledWith({
      user,
      plantingId: persisted.id,
      reason: 'PLANTING_CREATED',
    });
  });

  it('sets sowedAt to now on DIRECT_SOW -> IN_GROUND update without sowedAt', async () => {
    const { service, em } = createDeps();
    const planting = {
      id: 'planting-direct-1',
      user,
      bed: makeBed(),
      vegetable: makeVegetable(),
      plannedStartDate: new Date('2026-03-01T10:00:00.000Z'),
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

    em.findOne.mockResolvedValue(planting);

    await service.update(user, planting.id, {
      status: PlantingStatus.IN_GROUND,
    });

    expect(planting.sowedAt).toBeInstanceOf(Date);
    expect(planting.actualStartDate).toBeInstanceOf(Date);
  });

  it('sets transplantedAt to now on NEW -> IN_GROUND update without transplantedAt', async () => {
    const { service, em } = createDeps();
    const planting = {
      id: 'planting-4',
      user,
      bed: makeBed(),
      vegetable: makeVegetable(),
      plannedStartDate: new Date('2026-03-01T10:00:00.000Z'),
      actualStartDate: null,
      startMethod: PlantingStartMethod.TRANSPLANT,
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

    em.findOne.mockResolvedValue(planting);

    await service.update(user, planting.id, {
      status: PlantingStatus.IN_GROUND,
    });

    expect(planting.transplantedAt).toBeInstanceOf(Date);
  });

  it('sets transplantedAt to now when PATCH ends with TRANSPLANT + IN_GROUND even without status change', async () => {
    const { service, em } = createDeps();
    const planting = {
      id: 'planting-5',
      user,
      bed: makeBed(),
      vegetable: makeVegetable(),
      plannedStartDate: new Date('2026-03-01T10:00:00.000Z'),
      actualStartDate: null,
      startMethod: PlantingStartMethod.DIRECT_SOW,
      sowedAt: new Date('2026-03-01T10:00:00.000Z'),
      transplantedAt: null,
      harvestWindowStart: null,
      harvestWindowEnd: null,
      timelineTimezone: 'Europe/Warsaw',
      appliedRulesVersion: 1,
      status: PlantingStatus.IN_GROUND,
      notes: null,
      harvestResults: { getItems: () => [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Planting;

    em.findOne.mockResolvedValue(planting);

    await service.update(user, planting.id, {
      startMethod: PlantingStartMethod.TRANSPLANT,
    });

    expect(planting.transplantedAt).toBeInstanceOf(Date);
  });

  it('triggers action recompute after auto-setting transplantedAt on status change', async () => {
    const { service, em, actionAutomationService, plantingInsightsService } =
      createDeps();
    const planting = {
      id: 'planting-3',
      user,
      bed: makeBed(),
      vegetable: makeVegetable(),
      plannedStartDate: new Date('2026-03-01T10:00:00.000Z'),
      actualStartDate: null,
      startMethod: PlantingStartMethod.TRANSPLANT,
      sowedAt: null,
      transplantedAt: null,
      harvestWindowStart: null,
      harvestWindowEnd: null,
      timelineTimezone: 'Europe/Warsaw',
      appliedRulesVersion: 1,
      status: PlantingStatus.SEEDLING_READY_FOR_TRANSPLANT,
      notes: null,
      harvestResults: { getItems: () => [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Planting;

    em.findOne.mockResolvedValue(planting);

    await service.update(user, planting.id, {
      status: PlantingStatus.IN_GROUND,
    });

    expect(actionAutomationService.recomputeForPlanting).toHaveBeenCalledWith({
      user,
      plantingId: planting.id,
      reason: 'PLANTING_TIMELINE_UPDATED',
    });
    expect(plantingInsightsService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: PlantingEventType.PLANTING_TRANSPLANTED,
      }),
    );
  });
});
