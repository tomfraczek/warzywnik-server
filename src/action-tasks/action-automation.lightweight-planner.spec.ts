/**
 * Tests for the lightweight planner requirements.
 */

import { PlantingLifecycleTaskGenerator } from './generators/planting-lifecycle-task.generator';
import { HarvestReadinessDecisionEvaluator } from './decision-engine/evaluators/harvest-readiness-decision.evaluator';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
  ActionTemplateGenerationMode,
  ActionTemplateTarget,
} from '../common/enums/action.enums';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { GeneratorContext } from './generators/task-generation.types';
import { VegetableActionRule } from '../vegetables/vegetable-action-rule.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';

function makeTemplate(
  overrides: Partial<ActionTemplate> & { slug?: string },
): ActionTemplate {
  return {
    id: overrides.id ?? 'tpl-1',
    slug: overrides.slug ?? 'some-template',
    name: overrides.name ?? 'Template',
    generationMode:
      overrides.generationMode ?? ActionTemplateGenerationMode.AUTO,
    target: overrides.target ?? ActionTemplateTarget.PLANTING,
    allowedPlantingStatuses:
      'allowedPlantingStatuses' in overrides
        ? overrides.allowedPlantingStatuses
        : null,
  } as unknown as ActionTemplate;
}

function makeRule(
  id: string,
  trigger: ActionRuleTrigger,
  template: ActionTemplate,
): VegetableActionRule {
  return {
    id,
    trigger,
    schedule: ActionRuleSchedule.ONCE,
    intervalDays: null,
    applyIfStartMethod: [],
    actionTemplate: template,
  } as unknown as VegetableActionRule;
}

function makePlantingBase(status: PlantingStatus) {
  const base = new Date('2026-05-01T08:00:00.000Z');
  return {
    id: 'planting-1',
    status,
    startMethod: PlantingStartMethod.DIRECT_SOW,
    timelineTimezone: 'UTC',
    plannedStartDate: base,
    actualStartDate: base,
    sowedAt: base,
    transplantedAt: null as Date | null,
    harvestWindowStart: null as Date | null,
    harvestWindowEnd: null as Date | null,
    appliedRulesVersion: 1,
    vegetable: { id: 'veg-1', rulesVersion: 1 },
    bed: { id: 'bed-1', growingSpace: { id: 'gs-1' } },
  };
}

describe('PlantingLifecycleTaskGenerator - non-AUTO modes skipped', () => {
  const generator = new PlantingLifecycleTaskGenerator();
  const now = new Date('2026-05-01T08:00:00.000Z');

  for (const mode of [
    ActionTemplateGenerationMode.WEATHER_TRIGGERED,
    ActionTemplateGenerationMode.SEASONAL,
  ]) {
    it('does not produce a candidate for generationMode ' + mode, () => {
      const template = makeTemplate({
        generationMode: mode,
        slug: 'test-' + mode,
      });
      const rule = makeRule('rule-1', ActionRuleTrigger.ON_SOWED, template);
      const context: GeneratorContext = {
        planting: makePlantingBase(PlantingStatus.IN_GROUND) as never,
        rules: [rule],
      };
      const candidates = generator.generate(
        context,
        () => now,
        (_id, firstDueAt) => [
          {
            kind: 'LIFECYCLE' as const,
            trigger: rule.trigger,
            dueAt: firstDueAt,
            cycleIndex: 0,
            rule,
            sourceKey: 'k',
          },
        ],
      );
      expect(candidates).toHaveLength(0);
    });
  }

  it('DOES produce a candidate for generationMode AUTO', () => {
    const template = makeTemplate({
      generationMode: ActionTemplateGenerationMode.AUTO,
    });
    const rule = makeRule('rule-auto', ActionRuleTrigger.ON_SOWED, template);
    const context: GeneratorContext = {
      planting: makePlantingBase(PlantingStatus.IN_GROUND) as never,
      rules: [rule],
    };
    const candidates = generator.generate(
      context,
      () => now,
      (_id, firstDueAt) => [
        {
          kind: 'LIFECYCLE' as const,
          trigger: rule.trigger,
          dueAt: firstDueAt,
          cycleIndex: 0,
          rule,
          sourceKey: 'k',
        },
      ],
    );
    expect(candidates).toHaveLength(1);
  });
});

describe('allowedPlantingStatuses filter logic', () => {
  const now = new Date('2026-05-01T08:00:00.000Z');

  function applyStatusFilter(
    candidates: Array<{ rule: VegetableActionRule; dueAt: Date }>,
    plantingStatus: PlantingStatus,
  ) {
    const ROUTINE_PLANTING_DEFAULT_STATUSES = [
      'IN_GROUND',
      'READY_FOR_FINAL_HARVEST',
    ];
    return candidates.filter((candidate) => {
      const tpl = candidate.rule.actionTemplate as unknown as {
        allowedPlantingStatuses: string[] | null;
        generationMode: ActionTemplateGenerationMode;
        target: ActionTemplateTarget;
      };
      const allowed = tpl.allowedPlantingStatuses;
      if (allowed && allowed.length > 0) {
        if (!allowed.includes(plantingStatus as unknown as string))
          return false;
      } else if (
        tpl.generationMode === ActionTemplateGenerationMode.ROUTINE &&
        tpl.target === ActionTemplateTarget.PLANTING
      ) {
        if (
          !ROUTINE_PLANTING_DEFAULT_STATUSES.includes(
            plantingStatus as unknown as string,
          )
        )
          return false;
      }
      return candidate.dueAt.getTime() === now.getTime();
    });
  }

  it('zbior-plonow excluded for IN_GROUND', () => {
    const rule = makeRule(
      'r1',
      ActionRuleTrigger.ON_SOWED,
      makeTemplate({
        slug: 'zbior-plonow',
        allowedPlantingStatuses: ['READY_FOR_FINAL_HARVEST'],
      }),
    );
    expect(
      applyStatusFilter([{ rule, dueAt: now }], PlantingStatus.IN_GROUND),
    ).toHaveLength(0);
  });

  it('zbior-plonow included for READY_FOR_FINAL_HARVEST', () => {
    const rule = makeRule(
      'r1',
      ActionRuleTrigger.ON_SOWED,
      makeTemplate({
        slug: 'zbior-plonow',
        allowedPlantingStatuses: ['READY_FOR_FINAL_HARVEST'],
      }),
    );
    expect(
      applyStatusFilter(
        [{ rule, dueAt: now }],
        PlantingStatus.READY_FOR_FINAL_HARVEST,
      ),
    ).toHaveLength(1);
  });

  it('podwiazywanie-roslin excluded for NEW', () => {
    const rule = makeRule(
      'r1',
      ActionRuleTrigger.ON_SOWED,
      makeTemplate({
        slug: 'podwiazywanie-roslin',
        allowedPlantingStatuses: ['IN_GROUND', 'READY_FOR_FINAL_HARVEST'],
      }),
    );
    expect(
      applyStatusFilter(
        [{ rule, dueAt: now }],
        PlantingStatus.NEW,
      ),
    ).toHaveLength(0);
  });

  it('ROUTINE planting task excluded for NEW (default guard)', () => {
    const rule = makeRule(
      'r1',
      ActionRuleTrigger.ON_SOWED,
      makeTemplate({
        generationMode: ActionTemplateGenerationMode.ROUTINE,
        target: ActionTemplateTarget.PLANTING,
        allowedPlantingStatuses: null,
      }),
    );
    expect(
      applyStatusFilter(
        [{ rule, dueAt: now }],
        PlantingStatus.NEW,
      ),
    ).toHaveLength(0);
  });

  it('ROUTINE planting task included for IN_GROUND (default guard)', () => {
    const rule = makeRule(
      'r1',
      ActionRuleTrigger.ON_SOWED,
      makeTemplate({
        generationMode: ActionTemplateGenerationMode.ROUTINE,
        target: ActionTemplateTarget.PLANTING,
        allowedPlantingStatuses: null,
      }),
    );
    expect(
      applyStatusFilter([{ rule, dueAt: now }], PlantingStatus.IN_GROUND),
    ).toHaveLength(1);
  });
});

describe('HarvestReadinessDecisionEvaluator - slug selection', () => {
  const evaluator = new HarvestReadinessDecisionEvaluator();

  function buildContext(
    status: PlantingStatus,
    harvestWindowStart: Date | null,
  ) {
    return {
      planting: {
        id: 'planting-1',
        status,
        harvestWindowStart,
        harvestWindowEnd: null,
        timelineTimezone: 'UTC',
        bed: { id: 'bed-1' },
      },
      now: new Date('2026-05-01T08:00:00.000Z'),
      activeWarnings: [],
      pendingTasks: [],
      recentlyCanceledTasks: [],
      recentCompletedActionEvents: [],
      recentPrecipMm24h: 0,
      recentPrecipMm72h: 0,
      forecastPrecipMm24h: 0,
      forecastPrecipMm48h: 0,
      forecastMaxTemp24h: null,
    } as never;
  }

  it('uses zbior-plonow for READY_FOR_FINAL_HARVEST', () => {
    const ctx = buildContext(
      PlantingStatus.READY_FOR_FINAL_HARVEST,
      new Date('2026-04-28T00:00:00.000Z'),
    );
    const check = evaluator
      .evaluate(ctx)
      .find((c) => c.decisionType === 'HARVEST_CHECK');
    expect(check).toBeDefined();
    expect(check?.actionTemplateSlug).toBe('zbior-plonow');
  });

  it('uses kontrola-gotowosci-do-zbioru for IN_GROUND within 3 days of harvest window', () => {
    const ctx = buildContext(
      PlantingStatus.IN_GROUND,
      new Date('2026-05-03T00:00:00.000Z'),
    );
    const check = evaluator
      .evaluate(ctx)
      .find((c) => c.decisionType === 'HARVEST_CHECK');
    expect(check).toBeDefined();
    expect(check?.actionTemplateSlug).toBe('kontrola-gotowosci-do-zbioru');
  });

  it('returns no HARVEST_CHECK for IN_GROUND with harvest window far in future', () => {
    const ctx = buildContext(
      PlantingStatus.IN_GROUND,
      new Date('2026-06-01T00:00:00.000Z'),
    );
    const check = evaluator
      .evaluate(ctx)
      .find((c) => c.decisionType === 'HARVEST_CHECK');
    expect(check).toBeUndefined();
  });
});

describe('ActionAutomationService - terminal statuses produce 0 desired tasks', () => {
  const TERMINAL_STATUSES: PlantingStatus[] = [
    PlantingStatus.HARVESTED,
    PlantingStatus.CLEARED,
    PlantingStatus.FAILED,
    PlantingStatus.CANCELLED,
  ];

  for (const status of TERMINAL_STATUSES) {
    it(
      'returns desiredCount=0 for ' + String(status) + ' planting',
      async () => {
        const { EntityManager } = await import('@mikro-orm/postgresql');
        const { ActionAutomationService } = await import(
          './action-automation.service'
        );

        const planting = {
          id: 'planting-term',
          status,
          appliedRulesVersion: 1,
          vegetable: { id: 'veg-1', rulesVersion: 1 },
          bed: { id: 'bed-1', growingSpace: { id: 'gs-1' } },
          timelineTimezone: 'UTC',
        };

        const txEm = {
          findOne: jest.fn().mockResolvedValue(planting),
          find: jest.fn().mockResolvedValue([]),
          flush: jest.fn().mockResolvedValue(undefined),
          nativeUpdate: jest.fn().mockResolvedValue(0),
        } as unknown as InstanceType<typeof EntityManager>;

        const em = {
          transactional: jest
            .fn()
            .mockImplementation(
              (cb: (manager: InstanceType<typeof EntityManager>) => unknown) =>
                cb(txEm),
            ),
        } as unknown as InstanceType<typeof EntityManager>;

        const service = new ActionAutomationService(em);

        jest
          .spyOn(
            service as unknown as {
              resetGeneratedTasksForPlanting: () => Promise<void>;
            },
            'resetGeneratedTasksForPlanting',
          )
          .mockResolvedValue(undefined);

        jest
          .spyOn(
            service as unknown as {
              upsertGeneratedTaskAndReminder: () => Promise<void>;
            },
            'upsertGeneratedTaskAndReminder',
          )
          .mockResolvedValue(undefined);

        const result = await service.recomputeForPlanting({
          user: { id: 'user-1', automaticTasksEnabled: true } as never,
          plantingId: 'planting-term',
          reason: 'TEST',
        });

        expect(result.desiredCount).toBe(0);
      },
    );
  }
});
