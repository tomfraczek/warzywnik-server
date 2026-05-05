import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';
import { Planting } from '../plantings/planting.entity';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';

describe('ActionAutomationService without baseline fallback', () => {
  const service = new ActionAutomationService({} as EntityManager);

  it('returns no candidates when no routine rule is due today', () => {
    const target = service as unknown as {
      buildCandidatesForPlanting: (
        planting: Planting,
        rules: unknown[],
      ) => unknown[];
    };

    const planting = {
      id: 'planting-1',
      startMethod: PlantingStartMethod.DIRECT_SOW,
      status: PlantingStatus.IN_GROUND,
      plannedStartDate: new Date('2026-05-01T00:00:00.000Z'),
      actualStartDate: new Date('2026-05-01T00:00:00.000Z'),
      sowedAt: new Date('2026-05-01T00:00:00.000Z'),
      transplantedAt: null,
      harvestWindowStart: null,
      harvestWindowEnd: null,
      harvestedAt: null,
      timelineTimezone: 'Europe/Warsaw',
    } as Planting;

    const candidates = target.buildCandidatesForPlanting(planting, []);
    expect(candidates).toHaveLength(0);
  });

  it('does not expose daily baseline fallback internals', () => {
    const target = service as unknown as {
      ensureDailyBaselineCandidate?: unknown;
      pickDailyBaselineRule?: unknown;
    };

    expect(target.ensureDailyBaselineCandidate).toBeUndefined();
    expect(target.pickDailyBaselineRule).toBeUndefined();
  });
});
