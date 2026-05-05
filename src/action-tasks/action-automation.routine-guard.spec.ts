import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
} from '../common/enums/action.enums';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';

describe('ActionAutomationService routine watering guard', () => {
  it('decision skip for WATERING does not block routine MOISTURE_CHECK', async () => {
    const now = new Date('2026-05-05T08:00:00.000Z');
    const plantingId = 'planting-1';
    const wateringRuleId = 'rule-watering';
    const moistureRuleId = 'rule-moisture-check';

    const wateringRule = {
      id: wateringRuleId,
      trigger: ActionRuleTrigger.ON_SOWED,
      schedule: ActionRuleSchedule.EVERY_N_DAYS,
      actionTemplate: {
        id: 'tpl-watering',
        type: 'watering',
        name: 'Podlej uprawy',
      },
    } as unknown as { id: string };

    const moistureRule = {
      id: moistureRuleId,
      trigger: ActionRuleTrigger.ON_SOWED,
      schedule: ActionRuleSchedule.EVERY_N_DAYS,
      actionTemplate: {
        id: 'tpl-moisture',
        type: 'monitoring',
        name: 'Sprawdź wilgotność gleby',
      },
    } as unknown as { id: string };

    const planting = {
      id: plantingId,
      status: PlantingStatus.IN_GROUND,
      startMethod: PlantingStartMethod.DIRECT_SOW,
      timelineTimezone: 'UTC',
      plannedStartDate: now,
      actualStartDate: now,
      sowedAt: now,
      transplantedAt: null,
      harvestWindowStart: null,
      harvestWindowEnd: null,
      appliedRulesVersion: 1,
      vegetable: {
        id: 'veg-1',
        rulesVersion: 1,
      },
      bed: {
        id: 'bed-1',
        growingSpace: { id: 'gs-1' },
      },
    } as unknown as { id: string };

    const txEm = {
      findOne: jest.fn().mockResolvedValue(planting),
      find: jest.fn().mockResolvedValue([wateringRule, moistureRule]),
      flush: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    const rootEm = {
      transactional: jest
        .fn()
        .mockImplementation((cb: (em: EntityManager) => unknown) => cb(txEm)),
    } as unknown as EntityManager;

    const service = new ActionAutomationService(rootEm);

    (
      service as unknown as {
        buildCandidatesForPlanting: jest.Mock;
      }
    ).buildCandidatesForPlanting = jest.fn().mockReturnValue([
      {
        rule: wateringRule,
        sourceKey: 'routine:watering',
        cycleIndex: 0,
        dueAt: now,
      },
      {
        rule: moistureRule,
        sourceKey: 'routine:moisture',
        cycleIndex: 0,
        dueAt: now,
      },
    ]);

    (
      service as unknown as {
        applyAntiFloodLimits: jest.Mock;
      }
    ).applyAntiFloodLimits = jest.fn().mockResolvedValue({
      accepted: [
        {
          rule: wateringRule,
          sourceKey: 'routine:watering',
          cycleIndex: 0,
          dueAt: now,
        },
        {
          rule: moistureRule,
          sourceKey: 'routine:moisture',
          cycleIndex: 0,
          dueAt: now,
        },
      ],
      skipped: [],
    });

    (
      service as unknown as {
        buildDecisionEvaluation: jest.Mock;
      }
    ).buildDecisionEvaluation = jest.fn().mockResolvedValue({
      context: {},
      traces: [
        {
          evaluator: 'WateringDecisionEvaluator',
          decisionType: 'WATERING',
          result: 'SKIPPED',
          reason: 'skipped: forecast rain too high',
        },
      ],
      candidates: [],
    });

    (
      service as unknown as {
        resetGeneratedTasksForPlanting: jest.Mock;
      }
    ).resetGeneratedTasksForPlanting = jest.fn().mockResolvedValue(undefined);

    const upsertGeneratedTaskAndReminder: jest.Mock<
      Promise<void>,
      [{ rule: { id: string } }]
    > = jest.fn().mockResolvedValue(undefined) as unknown as jest.Mock<
      Promise<void>,
      [{ rule: { id: string } }]
    >;
    (
      service as unknown as {
        upsertGeneratedTaskAndReminder: jest.Mock;
      }
    ).upsertGeneratedTaskAndReminder = upsertGeneratedTaskAndReminder;

    (
      service as unknown as {
        upsertDecisionTaskAndReminder: jest.Mock;
      }
    ).upsertDecisionTaskAndReminder = jest.fn().mockResolvedValue(undefined);

    const cleanupStaleGeneratedTasksForPlanting: jest.Mock<
      Promise<void>,
      [{ desired: Array<{ ruleId?: string; decisionType?: string }> }]
    > = jest.fn().mockResolvedValue(undefined) as unknown as jest.Mock<
      Promise<void>,
      [{ desired: Array<{ ruleId?: string; decisionType?: string }> }]
    >;
    (
      service as unknown as {
        cleanupStaleGeneratedTasksForPlanting: jest.Mock;
      }
    ).cleanupStaleGeneratedTasksForPlanting =
      cleanupStaleGeneratedTasksForPlanting;

    (
      service as unknown as {
        resolveDecisionTypeFromTemplate: (rule: { id: string }) => string;
      }
    ).resolveDecisionTypeFromTemplate = (rule: { id: string }) =>
      rule.id === wateringRuleId ? 'WATERING' : 'MOISTURE_CHECK';

    await service.recomputeForPlanting({
      user: { id: 'user-1' } as never,
      plantingId,
      reason: 'TEST',
    });

    const firstUpsertArg = upsertGeneratedTaskAndReminder.mock.calls[0]?.[0];
    expect(upsertGeneratedTaskAndReminder).toHaveBeenCalledTimes(1);
    expect(firstUpsertArg?.rule.id).toBe(moistureRuleId);

    const firstCleanupArg =
      cleanupStaleGeneratedTasksForPlanting.mock.calls[0]?.[0];
    expect(cleanupStaleGeneratedTasksForPlanting).toHaveBeenCalledTimes(1);
    expect(firstCleanupArg?.desired).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: moistureRuleId,
          decisionType: 'MOISTURE_CHECK',
        }),
      ]),
    );

    expect(
      firstCleanupArg?.desired.some(
        (item: { decisionType?: string }) => item.decisionType === 'WATERING',
      ),
    ).toBe(false);
  });
});
