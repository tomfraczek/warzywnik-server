import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';
import { PlantingStatus } from '../common/enums/planting.enums';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
} from '../common/enums/action.enums';
import { DecisionEvaluationTrace } from './decision-engine/decision.types';

describe('ActionAutomationService debugTaskDecisionsForPlanting', () => {
  const now = new Date('2026-05-05T08:00:00.000Z');
  const plantingId = 'planting-1';

  const user = { id: 'user-1' } as unknown as { id: string };

  const planting = {
    id: plantingId,
    status: PlantingStatus.IN_GROUND,
    timelineTimezone: 'UTC',
    bed: {
      id: 'bed-1',
      growingSpace: { id: 'gs-1' },
      soil: {
        waterRetention: 'medium',
        drainage: 'medium',
        fertilityLevel: 'medium',
      },
    },
    vegetable: { id: 'veg-1', name: 'Pomidor' },
    sowedAt: now,
    transplantedAt: null,
    harvestWindowStart: null,
    harvestWindowEnd: null,
    plannedStartDate: now,
    actualStartDate: now,
  } as unknown;

  const makeContext = () =>
    ({
      now,
      planting,
      latestWeatherSnapshot: null,
      activeWarnings: [],
      pendingTasks: [],
      recentlyCanceledTasks: [],
      recentCompletedActionEvents: [],
      recentPrecipMm24h: 0,
      recentPrecipMm72h: 0,
      forecastPrecipMm24h: 0,
      forecastPrecipMm48h: 0,
      forecastMaxTemp24h: 22,
    }) as unknown;

  const createService = (opts?: {
    rules?: unknown[];
    decisionTraces?: DecisionEvaluationTrace[];
    context?: unknown;
    candidates?: unknown[];
    accepted?: unknown[];
    skipped?: Array<{ sourceKey: string; reason: string }>;
  }) => {
    const em = {
      findOne: jest.fn().mockResolvedValue(planting),
      find: jest.fn().mockResolvedValue(opts?.rules ?? []),
    } as unknown as EntityManager;

    const service = new ActionAutomationService(em);

    (
      service as unknown as { decisionContextBuilder: { build: jest.Mock } }
    ).decisionContextBuilder = {
      build: jest.fn().mockResolvedValue(opts?.context ?? makeContext()),
    };

    (
      service as unknown as { decisionEngine: { evaluateWithTrace: jest.Mock } }
    ).decisionEngine = {
      evaluateWithTrace: jest.fn().mockReturnValue(opts?.decisionTraces ?? []),
    };

    (
      service as unknown as { buildCandidatesForPlanting: jest.Mock }
    ).buildCandidatesForPlanting = jest
      .fn()
      .mockReturnValue(opts?.candidates ?? []);

    (
      service as unknown as { applyAntiFloodLimits: jest.Mock }
    ).applyAntiFloodLimits = jest.fn().mockResolvedValue({
      accepted: opts?.accepted ?? [],
      skipped: opts?.skipped ?? [],
    });

    return service;
  };

  it('returns explicit skipped reasons when no tasks are created', async () => {
    const service = createService({
      decisionTraces: [
        {
          evaluator: 'WateringDecisionEvaluator',
          decisionType: 'WATERING',
          result: 'SKIPPED',
          reason: 'skipped: no watering signal',
        },
      ],
    });

    const result = await service.debugTaskDecisionsForPlanting({
      user: user as never,
      plantingId,
    });

    expect(result.final.createdTasks).toHaveLength(0);
    expect(result.final.skippedDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'skipped: no watering signal' }),
      ]),
    );
  });

  it('shows watering skipped due rain forecast reason', async () => {
    const service = createService({
      decisionTraces: [
        {
          evaluator: 'WateringDecisionEvaluator',
          decisionType: 'WATERING',
          result: 'SKIPPED',
          reason: 'skipped: forecast rain too high',
        },
      ],
    });

    const result = await service.debugTaskDecisionsForPlanting({
      user: user as never,
      plantingId,
      verbose: true,
    });

    expect(result.decisions.evaluators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          decisionType: 'WATERING',
          result: 'SKIPPED',
          reason: 'skipped: forecast rain too high',
        }),
      ]),
    );

    expect(result.final.skippedDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          decisionType: 'WATERING',
          origin: 'DECISION_ENGINE',
          evaluator: 'WateringDecisionEvaluator',
        }),
      ]),
    );
  });

  it('does not include decision-engine watering task when watering is skipped', async () => {
    const dueAt = new Date('2026-05-05T10:00:00.000Z');
    const service = createService({
      decisionTraces: [
        {
          evaluator: 'WateringDecisionEvaluator',
          decisionType: 'WATERING',
          result: 'SKIPPED',
          reason: 'skipped: forecast rain too high',
        },
        {
          evaluator: 'WateringDecisionEvaluator',
          decisionType: 'WATERING',
          result: 'CREATED',
          reason: 'created: drought + high temperature',
          candidate: {
            decisionType: 'WATERING',
            targetType: 'planting',
            priority: 'high',
            shouldCreateTask: true,
            sourceKey: 'decision:watering:planting-1',
            actionTemplateSlug: 'Podlej uprawy',
            dueAt,
            reason: 'drought + temperature',
            confidence: 'high',
          },
        },
      ],
    });

    const result = await service.debugTaskDecisionsForPlanting({
      user: user as never,
      plantingId,
    });

    expect(
      result.final.createdTasks.some(
        (item) =>
          item.origin === 'DECISION_ENGINE' && item.decisionType === 'WATERING',
      ),
    ).toBe(false);
  });

  it('returns watering in created tasks when decision engine creates it', async () => {
    const dueAt = new Date('2026-05-05T10:00:00.000Z');
    const service = createService({
      decisionTraces: [
        {
          evaluator: 'WateringDecisionEvaluator',
          decisionType: 'WATERING',
          result: 'CREATED',
          reason: 'created: drought + high temperature',
          candidate: {
            decisionType: 'WATERING',
            targetType: 'planting',
            priority: 'high',
            shouldCreateTask: true,
            sourceKey: 'decision:watering:planting-1',
            actionTemplateSlug: 'Podlej uprawy',
            dueAt,
            reason: 'drought + temperature',
            confidence: 'high',
          },
        },
      ],
    });

    const result = await service.debugTaskDecisionsForPlanting({
      user: user as never,
      plantingId,
    });

    expect(result.final.createdTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          decisionType: 'WATERING',
          source: 'DECISION_ENGINE',
          title: 'Podlej uprawy',
          dueAt,
        }),
      ]),
    );
  });

  it('reports duplicate decision blocked reason', async () => {
    const service = createService({
      decisionTraces: [
        {
          evaluator: 'WateringDecisionEvaluator',
          decisionType: 'WATERING',
          result: 'SKIPPED',
          reason: 'skipped: duplicate sourceKey already accepted',
        },
      ],
    });

    const result = await service.debugTaskDecisionsForPlanting({
      user: user as never,
      plantingId,
    });

    expect(result.final.skippedDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          decisionType: 'WATERING',
          reason: 'skipped: duplicate sourceKey already accepted',
          origin: 'DECISION_ENGINE',
          evaluator: 'WateringDecisionEvaluator',
        }),
      ]),
    );
  });

  it('includes accepted routine rule in final created tasks', async () => {
    const dueAt = new Date();
    const rule = {
      id: 'rule-1',
      trigger: ActionRuleTrigger.ON_SOWED,
      schedule: ActionRuleSchedule.EVERY_N_DAYS,
      actionTemplate: {
        id: 'tpl-1',
        name: 'Podlej uprawy',
        type: 'watering',
      },
    } as never;

    const service = createService({
      rules: [rule],
      candidates: [
        {
          rule,
          sourceKey: 'routine:1',
          cycleIndex: 0,
          dueAt,
        },
      ],
      accepted: [
        {
          rule,
          sourceKey: 'routine:1',
          cycleIndex: 0,
          dueAt,
        },
      ],
      decisionTraces: [
        {
          evaluator: 'WateringDecisionEvaluator',
          decisionType: 'WATERING',
          result: 'SKIPPED',
          reason: 'skipped: forecast rain too high',
        },
      ],
    });

    (
      service as unknown as { resolveRuleBaseDueAt: () => Date }
    ).resolveRuleBaseDueAt = () => dueAt;
    (
      service as unknown as {
        buildOccurrences: () => Array<{ cycleIndex: number; dueAt: Date }>;
      }
    ).buildOccurrences = () => [{ cycleIndex: 0, dueAt }];

    const result = await service.debugTaskDecisionsForPlanting({
      user: user as never,
      plantingId,
    });

    expect(result.final.createdTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'VEGETABLE_RULE',
          origin: 'ROUTINE_RULE',
          title: 'Podlej uprawy',
          ruleId: 'rule-1',
          trigger: ActionRuleTrigger.ON_SOWED,
          schedule: ActionRuleSchedule.EVERY_N_DAYS,
        }),
      ]),
    );

    expect(result.final.skippedDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          decisionType: 'WATERING',
          origin: 'DECISION_ENGINE',
          reason: 'skipped: forecast rain too high',
        }),
      ]),
    );

    expect(
      result.final.conflicts?.some(
        (item) =>
          item.decisionType === 'WATERING' &&
          item.createdOrigins.includes('ROUTINE_RULE') &&
          item.skippedOrigins.includes('DECISION_ENGINE'),
      ),
    ).toBe(true);
  });
});
