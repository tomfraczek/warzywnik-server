import { EntityManager } from '@mikro-orm/postgresql';
import { PlanChecklistsService } from './plan-checklists.service';
import { PlanChecklistTemplate } from './plan-checklist-template.entity';
import { PlanChecklistItem } from './plan-checklist-item.entity';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';
import { FertilizerType } from '../fertilizers/fertilizer-type.entity';
import {
  PlanChecklistPriority,
  PlanChecklistScope,
  PlanChecklistSource,
  PlanChecklistStatus,
} from '../common/enums/plan-checklist.enums';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PlanChecklistsService', () => {
  const user = { id: 'user-1' } as never;

  const makeTemplate = (
    slug: string,
    scope: PlanChecklistScope,
    kind: string,
  ): PlanChecklistTemplate =>
    ({
      id: `${slug}-id`,
      slug,
      titleTemplate: 'T: {vegetableName}',
      descriptionTemplate: 'D: {vegetableName}',
      reasonTemplate: 'R: {vegetableName}',
      scope,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as unknown as PlanChecklistTemplate;

  const makeBed = (): Bed =>
    ({
      id: 'bed-1',
      name: 'Bed 1',
      depthCm: 20,
      soil: {
        id: 'soil-1',
        slug: 'glina',
        name: 'Glina',
        fertilityLevel: 'low',
        waterRetention: 'low',
      },
    }) as unknown as Bed;

  const makePlanting = (
    id: string,
    startMethod = PlantingStartMethod.DIRECT_SOW,
  ): Planting =>
    ({
      id,
      startMethod,
      status: PlantingStatus.NEW,
      vegetable: {
        id: `veg-${id}`,
        name: `Veg ${id}`,
        slug: `veg-${id}`,
        nutrientDemand: 'high',
        waterDemand: 'high',
        dominantNutrientDemand: 'N',
        minSoilDepthCm: 30,
        sowingMethods: [{ method: 'direct_sow' }],
        recommendedSoils: { getItems: () => [] },
        badCompanions: { getItems: () => [] },
      },
      plannedStartDate: new Date('2026-03-10T00:00:00.000Z'),
    }) as unknown as Planting;

  const createEm = () => {
    return {
      findOne: jest.fn(),
      find: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      persist: jest.fn(),
      getReference: jest.fn((_entity, id: string) => ({ id })),
    } as unknown as EntityManager & {
      findOne: jest.Mock;
      find: jest.Mock;
      flush: jest.Mock;
      persist: jest.Mock;
      getReference: jest.Mock;
    };
  };

  it('generates checklist for first NEW planting', async () => {
    const em = createEm();
    const service = new PlanChecklistsService(em);
    jest.spyOn(service, 'getBedPlan').mockResolvedValue({ ok: true } as never);

    em.findOne.mockResolvedValue(makeBed());
    em.find.mockImplementation((entity: unknown) => {
      if (entity === Planting) return Promise.resolve([makePlanting('1')]);
      if (entity === PlanChecklistItem) return Promise.resolve([]);
      if (entity === PlanChecklistTemplate)
        return Promise.resolve([
          makeTemplate(
            'clean-bed-before-plan',
            PlanChecklistScope.BED,
            'bed_has_new_plantings',
          ),
        ]);
      if (entity === FertilizerType) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    await service.recomputeForBed({ user, bedId: 'bed-1', reason: 'TEST' });

    expect(em.persist).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate bed-scoped items after another NEW planting recompute', async () => {
    const em = createEm();
    const service = new PlanChecklistsService(em);
    jest.spyOn(service, 'getBedPlan').mockResolvedValue({ ok: true } as never);

    const existing = {
      id: 'item-1',
      source: PlanChecklistSource.AUTO,
      sourceKey: 'plan-checklist:bed:bed-1:clean-bed-before-plan',
      dedupeKey: 'plan-checklist:bed:bed-1:clean-bed-before-plan',
      status: PlanChecklistStatus.PENDING,
      archivedAt: null,
      suppressedAt: null,
    } as unknown as PlanChecklistItem;

    em.findOne.mockResolvedValue(makeBed());
    em.find.mockImplementation((entity: unknown) => {
      if (entity === Planting)
        return Promise.resolve([makePlanting('1'), makePlanting('2')]);
      if (entity === PlanChecklistItem) return Promise.resolve([existing]);
      if (entity === PlanChecklistTemplate)
        return Promise.resolve([
          makeTemplate(
            'clean-bed-before-plan',
            PlanChecklistScope.BED,
            'bed_has_new_plantings',
          ),
        ]);
      if (entity === FertilizerType) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    await service.recomputeForBed({ user, bedId: 'bed-1', reason: 'TEST' });

    expect(em.persist).not.toHaveBeenCalled();
    expect(existing.archivedAt).toBeNull();
  });

  it('keeps DONE/SKIPPED state for auto item on recompute', async () => {
    const em = createEm();
    const service = new PlanChecklistsService(em);
    jest.spyOn(service, 'getBedPlan').mockResolvedValue({ ok: true } as never);

    const existingDone = {
      id: 'item-done',
      source: PlanChecklistSource.AUTO,
      sourceKey: 'plan-checklist:bed:bed-1:clean-bed-before-plan',
      dedupeKey: 'plan-checklist:bed:bed-1:clean-bed-before-plan',
      status: PlanChecklistStatus.DONE,
      archivedAt: null,
      suppressedAt: null,
    } as unknown as PlanChecklistItem;

    em.findOne.mockResolvedValue(makeBed());
    em.find.mockImplementation((entity: unknown) => {
      if (entity === Planting) return Promise.resolve([makePlanting('1')]);
      if (entity === PlanChecklistItem) return Promise.resolve([existingDone]);
      if (entity === PlanChecklistTemplate)
        return Promise.resolve([
          makeTemplate(
            'clean-bed-before-plan',
            PlanChecklistScope.BED,
            'bed_has_new_plantings',
          ),
        ]);
      if (entity === FertilizerType) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    await service.recomputeForBed({ user, bedId: 'bed-1', reason: 'TEST' });

    expect(existingDone.status).toBe(PlanChecklistStatus.DONE);
  });

  it('does not restore suppressed auto item', async () => {
    const em = createEm();
    const service = new PlanChecklistsService(em);
    jest.spyOn(service, 'getBedPlan').mockResolvedValue({ ok: true } as never);

    const suppressed = {
      id: 'item-suppressed',
      source: PlanChecklistSource.AUTO,
      sourceKey: 'plan-checklist:bed:bed-1:clean-bed-before-plan',
      dedupeKey: 'plan-checklist:bed:bed-1:clean-bed-before-plan',
      status: PlanChecklistStatus.PENDING,
      archivedAt: null,
      suppressedAt: new Date(),
    } as unknown as PlanChecklistItem;

    em.findOne.mockResolvedValue(makeBed());
    em.find.mockImplementation((entity: unknown) => {
      if (entity === Planting) return Promise.resolve([makePlanting('1')]);
      if (entity === PlanChecklistItem) return Promise.resolve([suppressed]);
      if (entity === PlanChecklistTemplate)
        return Promise.resolve([
          makeTemplate(
            'clean-bed-before-plan',
            PlanChecklistScope.BED,
            'bed_has_new_plantings',
          ),
        ]);
      if (entity === FertilizerType) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    await service.recomputeForBed({ user, bedId: 'bed-1', reason: 'TEST' });

    expect(em.persist).not.toHaveBeenCalled();
  });

  it('does not archive manual item on recompute', async () => {
    const em = createEm();
    const service = new PlanChecklistsService(em);
    jest.spyOn(service, 'getBedPlan').mockResolvedValue({ ok: true } as never);

    const manual = {
      id: 'manual-1',
      source: PlanChecklistSource.MANUAL,
      sourceKey: null,
      dedupeKey: null,
      archivedAt: null,
      suppressedAt: null,
    } as unknown as PlanChecklistItem;

    em.findOne.mockResolvedValue(makeBed());
    em.find.mockImplementation((entity: unknown) => {
      if (entity === Planting) return Promise.resolve([makePlanting('1')]);
      if (entity === PlanChecklistItem) return Promise.resolve([manual]);
      if (entity === PlanChecklistTemplate) return Promise.resolve([]);
      if (entity === FertilizerType) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    await service.recomputeForBed({ user, bedId: 'bed-1', reason: 'TEST' });

    expect(manual.archivedAt).toBeNull();
  });

  it('allows editing manual item', async () => {
    const em = createEm();
    const service = new PlanChecklistsService(em);

    const manual = {
      id: 'manual-1',
      user,
      source: PlanChecklistSource.MANUAL,
      status: PlanChecklistStatus.PENDING,
      title: 'Old',
      description: null,
      priority: PlanChecklistPriority.LOW,
      isUserModified: false,
      doneAt: null,
      skippedAt: null,
      bed: { id: 'bed-1' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as PlanChecklistItem;

    em.findOne.mockResolvedValue(manual);

    const result = await service.patchItem(user, 'manual-1', {
      title: 'New title',
      description: 'New desc',
      priority: PlanChecklistPriority.HIGH,
      status: PlanChecklistStatus.DONE,
    });

    expect(result.title).toBe('New title');
    expect(result.status).toBe(PlanChecklistStatus.DONE);
    expect(manual.isUserModified).toBe(true);
  });

  it('blocks editing auto item title/description', async () => {
    const em = createEm();
    const service = new PlanChecklistsService(em);

    const auto = {
      id: 'auto-1',
      user,
      source: PlanChecklistSource.AUTO,
      status: PlanChecklistStatus.PENDING,
      title: 'Old',
      description: null,
      priority: PlanChecklistPriority.LOW,
      isUserModified: false,
      doneAt: null,
      skippedAt: null,
      bed: { id: 'bed-1' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as PlanChecklistItem;

    em.findOne.mockResolvedValue(auto);

    await expect(
      service.patchItem(user, 'auto-1', { title: 'Not allowed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('is user-scoped when patching and suppressing items', async () => {
    const em = createEm();
    const service = new PlanChecklistsService(em);

    em.findOne.mockResolvedValue(null);

    await expect(
      service.patchItem(user, 'foreign-item', {
        status: PlanChecklistStatus.DONE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.suppressItem(user, 'foreign-item'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
