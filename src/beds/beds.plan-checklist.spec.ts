import { EntityManager } from '@mikro-orm/postgresql';
import { BedsService } from './beds.service';
import { Bed } from './bed.entity';
import { PlanChecklistsService } from '../plan-checklists/plan-checklists.service';

describe('BedsService plan checklist triggers', () => {
  it('recomputes bed plan when depth changes', async () => {
    const bed = {
      id: 'bed-1',
      user: { id: 'user-1' },
      name: 'Bed 1',
      depthCm: 20,
      soil: null,
      growingSpace: { id: 'space-1', name: 'S', type: 'OUTDOOR' },
      isActive: true,
      cultivationEnvironment: 'GROUND_OUTDOOR',
      soilTestingEnabled: false,
      measuredN: null,
      measuredP: null,
      measuredK: null,
      measuredPh: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Bed;

    const em = {
      findOne: jest.fn().mockResolvedValue(bed),
      flush: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    const weatherRecomputeService = {
      recomputeWarnings: jest.fn(),
      recomputeTasks: jest.fn(),
    } as never;

    const plantingInsightsService = {} as never;
    const actionAutomationService = {} as never;
    const recomputeForBed = jest.fn().mockResolvedValue(undefined);
    const planChecklistsService = {
      recomputeForBed,
    } as unknown as PlanChecklistsService;

    const service = new BedsService(
      em,
      weatherRecomputeService,
      plantingInsightsService,
      actionAutomationService,
      planChecklistsService,
    );

    await service.update({ id: 'user-1' } as never, bed.id, { depthCm: 30 });

    expect(recomputeForBed).toHaveBeenCalledWith({
      user: { id: 'user-1' },
      bedId: bed.id,
      reason: 'BED_PLAN_INPUTS_UPDATED',
    });
  });
});
