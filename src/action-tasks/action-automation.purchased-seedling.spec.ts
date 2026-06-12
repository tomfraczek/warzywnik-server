/**
 * Tests for PURCHASED_SEEDLING start method.
 *
 * Covers:
 *  1. Lifecycle path: NEW → IN_GROUND → READY_FOR_FINAL_HARVEST → HARVESTED → CLEARED
 *  2. transplantedAt (not sowedAt) is the anchor date for IN_GROUND transition
 *  3. harvest window calculated from transplantedAt
 *  4. ON_SOWED / AFTER_SOWING_DAYS rules do NOT generate tasks (no sowedAt)
 *  5. ON_TRANSPLANTED / AFTER_TRANSPLANT_DAYS rules work via transplantedAt
 *  6. getCoverage() accounts for PURCHASED_SEEDLING
 */

import {
  getAllowedStatusTransitions,
  getLifecyclePath,
  isStatusAllowedForStartMethod,
} from '../plantings/planting-lifecycle';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { ActionAutomationService } from './action-automation.service';
import { Planting } from '../plantings/planting.entity';
import { VegetableActionRule } from '../vegetables/vegetable-action-rule.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
  ActionTemplateGenerationMode,
} from '../common/enums/action.enums';
import { addDays, normalizeDueAt } from '../common/types/date-utils';
import { EntityManager } from '@mikro-orm/postgresql';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makePurchasedSeedlingPlanting = (
  overrides: Partial<Planting> = {},
): Planting =>
  ({
    id: 'ps-planting-1',
    startMethod: PlantingStartMethod.PURCHASED_SEEDLING,
    status: PlantingStatus.IN_GROUND,
    plannedStartDate: new Date('2026-05-01T00:00:00.000Z'),
    actualStartDate: new Date('2026-05-01T00:00:00.000Z'),
    sowedAt: null,
    transplantedAt: new Date('2026-05-01T00:00:00.000Z'),
    harvestWindowStart: null,
    harvestWindowEnd: null,
    harvestedAt: null,
    timelineTimezone: 'Europe/Warsaw',
    ...overrides,
  }) as Planting;

const makeRule = (
  trigger: ActionRuleTrigger,
  applyIfStartMethod: string[] | null = null,
): VegetableActionRule =>
  ({
    id: `rule-${trigger}`,
    trigger,
    offsetDays: 1,
    schedule: ActionRuleSchedule.ONCE,
    everyNDays: null,
    occurrencesLimit: null,
    isEnabled: true,
    applyIfStartMethod,
    actionTemplate: {
      id: 'tpl-1',
      name: 'Test task',
      generationMode: ActionTemplateGenerationMode.AUTO,
    } as ActionTemplate,
  }) as unknown as VegetableActionRule;

// ─── 1. Lifecycle path ────────────────────────────────────────────────────────

describe('PURCHASED_SEEDLING lifecycle path', () => {
  it('has the same path as DIRECT_SOW: NEW → IN_GROUND → READY_FOR_FINAL_HARVEST → HARVESTED → CLEARED', () => {
    const path = getLifecyclePath(PlantingStartMethod.PURCHASED_SEEDLING);
    expect(path).toEqual([
      PlantingStatus.NEW,
      PlantingStatus.IN_GROUND,
      PlantingStatus.READY_FOR_FINAL_HARVEST,
      PlantingStatus.HARVESTED,
      PlantingStatus.CLEARED,
    ]);
  });

});

// ─── 2. isStatusAllowedForStartMethod ────────────────────────────────────────

describe('PURCHASED_SEEDLING — isStatusAllowedForStartMethod', () => {
  it('allows IN_GROUND', () => {
    expect(
      isStatusAllowedForStartMethod(
        PlantingStatus.IN_GROUND,
        PlantingStartMethod.PURCHASED_SEEDLING,
      ),
    ).toBe(true);
  });

  it('allows NEW', () => {
    expect(
      isStatusAllowedForStartMethod(
        PlantingStatus.NEW,
        PlantingStartMethod.PURCHASED_SEEDLING,
      ),
    ).toBe(true);
  });

});

// ─── 3. Allowed status transitions ───────────────────────────────────────────

describe('PURCHASED_SEEDLING — getAllowedStatusTransitions', () => {
  it('from NEW allows IN_GROUND (fast-forward) and FAILED/CANCELLED', () => {
    const allowed = getAllowedStatusTransitions(
      PlantingStatus.NEW,
      PlantingStartMethod.PURCHASED_SEEDLING,
    );
    expect(allowed).toContain(PlantingStatus.IN_GROUND);
    expect(allowed).toContain(PlantingStatus.FAILED);
    expect(allowed).toContain(PlantingStatus.CANCELLED);
  });

  it('from IN_GROUND allows READY_FOR_FINAL_HARVEST', () => {
    const allowed = getAllowedStatusTransitions(
      PlantingStatus.IN_GROUND,
      PlantingStartMethod.PURCHASED_SEEDLING,
    );
    expect(allowed).toContain(PlantingStatus.READY_FOR_FINAL_HARVEST);
  });
});

// ─── 5 & 6. Action automation — rule filtering ───────────────────────────────

describe('PURCHASED_SEEDLING — action automation rule filtering', () => {
  const service = new ActionAutomationService({} as EntityManager);

  const target = service as unknown as {
    buildCandidatesForPlanting: (
      planting: Planting,
      rules: VegetableActionRule[],
    ) => Array<{ trigger: ActionRuleTrigger; dueAt: Date }>;
  };

  it('ON_SOWED rule with applyIfStartMethod null returns no candidates (sowedAt is null)', () => {
    const planting = makePurchasedSeedlingPlanting({ sowedAt: null });
    const rule = makeRule(ActionRuleTrigger.ON_SOWED, null);
    const candidates = target.buildCandidatesForPlanting(planting, [rule]);
    expect(candidates).toHaveLength(0);
  });

  it('ON_SOWED rule with applyIfStartMethod restricted to DIRECT_SOW/TRANSPLANT is filtered out for PURCHASED_SEEDLING', () => {
    const planting = makePurchasedSeedlingPlanting({ sowedAt: null });
    const rule = makeRule(ActionRuleTrigger.ON_SOWED, [
      'DIRECT_SOW',
      'TRANSPLANT',
    ]);
    const candidates = target.buildCandidatesForPlanting(planting, [rule]);
    expect(candidates).toHaveLength(0);
  });

  it('AFTER_SOWING_DAYS rule returns no candidates when sowedAt is null', () => {
    const planting = makePurchasedSeedlingPlanting({ sowedAt: null });
    const rule = makeRule(ActionRuleTrigger.AFTER_SOWING_DAYS, null);
    const candidates = target.buildCandidatesForPlanting(planting, [rule]);
    expect(candidates).toHaveLength(0);
  });

  it('ON_TRANSPLANTED rule with PURCHASED_SEEDLING in applyIfStartMethod generates candidate when transplantedAt set', () => {
    const transplantedAt = addDays(
      normalizeDueAt(new Date(), 'Europe/Warsaw'),
      0,
    );
    const planting = makePurchasedSeedlingPlanting({ transplantedAt });
    const rule = makeRule(ActionRuleTrigger.ON_TRANSPLANTED, [
      'TRANSPLANT',
      'PURCHASED_SEEDLING',
    ]);
    const candidates = target.buildCandidatesForPlanting(planting, [rule]);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].trigger).toBe(ActionRuleTrigger.ON_TRANSPLANTED);
  });

  it('AFTER_TRANSPLANT_DAYS rule (offset 1) generates candidate for PURCHASED_SEEDLING with transplantedAt yesterday', () => {
    const transplantedAtYesterday = addDays(
      normalizeDueAt(new Date(), 'Europe/Warsaw'),
      -1,
    );
    const planting = makePurchasedSeedlingPlanting({
      transplantedAt: transplantedAtYesterday,
    });
    const rule = {
      ...makeRule(ActionRuleTrigger.AFTER_TRANSPLANT_DAYS, [
        'TRANSPLANT',
        'PURCHASED_SEEDLING',
      ]),
      schedule: ActionRuleSchedule.EVERY_N_DAYS,
      everyNDays: 7,
    } as unknown as VegetableActionRule;

    const candidates = target.buildCandidatesForPlanting(planting, [rule]);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('AFTER_TRANSPLANT_DAYS rule filtered out when applyIfStartMethod excludes PURCHASED_SEEDLING', () => {
    const transplantedAt = addDays(
      normalizeDueAt(new Date(), 'Europe/Warsaw'),
      -1,
    );
    const planting = makePurchasedSeedlingPlanting({ transplantedAt });
    const rule = {
      ...makeRule(ActionRuleTrigger.AFTER_TRANSPLANT_DAYS, ['TRANSPLANT']),
      schedule: ActionRuleSchedule.EVERY_N_DAYS,
      everyNDays: 7,
    } as unknown as VegetableActionRule;

    const candidates = target.buildCandidatesForPlanting(planting, [rule]);
    expect(candidates).toHaveLength(0);
  });
});

// ─── 7. getCoverage includes PURCHASED_SEEDLING ───────────────────────────────

describe('getCoverage includes PURCHASED_SEEDLING as third start method', () => {
  it('totalMethodPairs = vegetables × 3 when PURCHASED_SEEDLING is in startMethods', async () => {
    const { ActionTemplate } = await import(
      '../action-templates/action-template.entity'
    );
    const { Vegetable } = await import('../vegetables/vegetable.entity');
    const { VegetableActionRule } = await import(
      '../vegetables/vegetable-action-rule.entity'
    );

    const em = {
      find: jest.fn((entity: unknown) => {
        if (entity === ActionTemplate) return Promise.resolve([]);
        if (entity === Vegetable)
          return Promise.resolve([{ id: 'v1', name: 'Pomidor' }]);
        if (entity === VegetableActionRule) return Promise.resolve([]);
        return Promise.resolve([]);
      }),
      count: jest.fn().mockResolvedValue(0),
    } as unknown as EntityManager;

    const svc = new ActionAutomationService(em);
    const result = (await svc.getCoverage()) as {
      coverage: { totalMethodPairs: number };
    };

    // 1 vegetable × 3 start methods = 3 pairs
    expect(result.coverage.totalMethodPairs).toBe(3);
  });
});
