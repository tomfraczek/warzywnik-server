import { PlantingStatus } from '../../../common/enums/planting.enums';
import { normalizeDueAt } from '../../../common/types/date-utils';
import { DecisionEvaluator } from '../decision-evaluator.interface';
import {
  hasPendingDecisionTask,
  hasCompletedDecisionToday,
} from '../decision-context.helpers';
import {
  DecisionCandidate,
  DecisionEvaluationTrace,
  PlantingDecisionContext,
} from '../decision.types';

export class HarvestReadinessDecisionEvaluator implements DecisionEvaluator {
  evaluate(context: PlantingDecisionContext): DecisionCandidate[] {
    const trace = this.evaluateWithTrace(context, false);
    return trace.result === 'CREATED' && trace.candidate
      ? [trace.candidate]
      : [];
  }

  evaluateWithTrace(
    context: PlantingDecisionContext,
    verbose = false,
  ): DecisionEvaluationTrace {
    if (hasPendingDecisionTask(context, 'HARVEST_CHECK')) {
      return {
        evaluator: 'HarvestReadinessDecisionEvaluator',
        decisionType: 'HARVEST_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: existing pending task',
      };
    }

    if (hasCompletedDecisionToday(context, 'HARVEST_CHECK')) {
      return {
        evaluator: 'HarvestReadinessDecisionEvaluator',
        decisionType: 'HARVEST_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: harvest check already completed today',
      };
    }

    if (
      context.planting.status === PlantingStatus.HARVESTED ||
      context.planting.status === PlantingStatus.CLEARED ||
      context.planting.status === PlantingStatus.FAILED ||
      context.planting.status === PlantingStatus.CANCELLED
    ) {
      return {
        evaluator: 'HarvestReadinessDecisionEvaluator',
        decisionType: 'HARVEST_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: final lifecycle status',
      };
    }

    const dueAt = normalizeDueAt(
      context.now,
      context.planting.timelineTimezone,
    );

    if (context.planting.status === PlantingStatus.READY_FOR_FINAL_HARVEST) {
      const candidate: DecisionCandidate = {
        decisionType: 'HARVEST_CHECK',
        targetType: 'planting',
        plantingId: context.planting.id,
        bedId: context.planting.bed.id,
        priority: 'high',
        dueAt,
        reason: 'Uprawa jest gotowa do końcowego zbioru.',
        confidence: 'high',
        sourceKey: `decision:harvest-check:${context.planting.id}`,
        // Use zbior-plonow template explicitly — only valid for READY_FOR_FINAL_HARVEST
        actionTemplateSlug: 'zbior-plonow',
        shouldCreateTask: true,
      };

      return {
        evaluator: 'HarvestReadinessDecisionEvaluator',
        decisionType: 'HARVEST_CHECK',
        result: 'CREATED',
        reason: 'created: planting READY_FOR_FINAL_HARVEST',
        details: verbose ? { status: context.planting.status } : undefined,
        candidate,
      };
    }

    if (
      context.planting.status === PlantingStatus.IN_GROUND &&
      context.planting.harvestWindowStart &&
      context.planting.harvestWindowStart.getTime() - context.now.getTime() <=
        3 * 24 * 60 * 60 * 1000
    ) {
      const candidate: DecisionCandidate = {
        decisionType: 'HARVEST_CHECK',
        targetType: 'planting',
        plantingId: context.planting.id,
        bedId: context.planting.bed.id,
        priority: 'medium',
        dueAt,
        reason: 'Zbliża się okno zbioru; warto sprawdzić dojrzałość.',
        confidence: 'medium',
        sourceKey: `decision:harvest-window-check:${context.planting.id}`,
        actionTemplateSlug: 'kontrola-gotowosci-do-zbioru',
        shouldCreateTask: true,
      };

      return {
        evaluator: 'HarvestReadinessDecisionEvaluator',
        decisionType: 'HARVEST_CHECK',
        result: 'CREATED',
        reason: 'created: harvest window is near',
        details: verbose
          ? {
              harvestWindowStart:
                context.planting.harvestWindowStart?.toISOString() ?? null,
            }
          : undefined,
        candidate,
      };
    }

    return {
      evaluator: 'HarvestReadinessDecisionEvaluator',
      decisionType: 'HARVEST_CHECK',
      result: 'SKIPPED',
      reason: 'skipped: harvest window not near and status not final-harvest',
    };
  }
}
