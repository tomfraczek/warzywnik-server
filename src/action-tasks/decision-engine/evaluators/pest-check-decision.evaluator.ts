import { normalizeDueAt } from '../../../common/types/date-utils';
import { DecisionEvaluator } from '../decision-evaluator.interface';
import {
  hasCompletedDecisionToday,
  hasPendingDecisionTask,
} from '../decision-context.helpers';
import {
  DecisionCandidate,
  DecisionEvaluationTrace,
  PlantingDecisionContext,
} from '../decision.types';

export class PestCheckDecisionEvaluator implements DecisionEvaluator {
  private getKnownPestsCount(context: PlantingDecisionContext): number {
    const pests = context.planting.vegetable.commonPests as unknown;
    if (Array.isArray(pests)) {
      return pests.length;
    }

    const collection = pests as {
      isInitialized?: () => boolean;
      getItems?: () => unknown[];
    };

    if (
      typeof collection.isInitialized === 'function' &&
      !collection.isInitialized()
    ) {
      return 0;
    }

    if (typeof collection.getItems === 'function') {
      return collection.getItems().length;
    }

    return 0;
  }

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
    if (hasPendingDecisionTask(context, 'PEST_CHECK')) {
      return {
        evaluator: 'PestCheckDecisionEvaluator',
        decisionType: 'PEST_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: existing pending task',
      };
    }

    if (hasCompletedDecisionToday(context, 'PEST_CHECK')) {
      return {
        evaluator: 'PestCheckDecisionEvaluator',
        decisionType: 'PEST_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: pest check done today',
      };
    }

    const knownPestsCount = this.getKnownPestsCount(context);
    const hasKnownPestRisk = knownPestsCount > 0;
    if (!hasKnownPestRisk) {
      return {
        evaluator: 'PestCheckDecisionEvaluator',
        decisionType: 'PEST_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: no mapped pest risk for vegetable',
      };
    }

    const recentlyDone = context.recentCompletedActionEvents.some((event) => {
      const decisionType = event.payload?.decisionType;
      if (decisionType === 'PEST_CHECK') {
        return (
          context.now.getTime() - event.eventTime.getTime() <
          7 * 24 * 60 * 60 * 1000
        );
      }
      return false;
    });

    if (recentlyDone) {
      return {
        evaluator: 'PestCheckDecisionEvaluator',
        decisionType: 'PEST_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: pest check in cooldown window',
      };
    }

    const candidate: DecisionCandidate = {
      decisionType: 'PEST_CHECK',
      targetType: 'planting',
      plantingId: context.planting.id,
      bedId: context.planting.bed.id,
      priority: 'medium',
      dueAt: normalizeDueAt(context.now, context.planting.timelineTimezone),
      reason: 'Uprawa ma listę częstych szkodników i wymaga kontroli ryzyka.',
      confidence: 'medium',
      sourceKey: `decision:pest-check:${context.planting.id}`,
      actionTemplateSlug: 'kontrola-szkodnikow',
      shouldCreateTask: true,
    };

    return {
      evaluator: 'PestCheckDecisionEvaluator',
      decisionType: 'PEST_CHECK',
      result: 'CREATED',
      reason: 'created: pest risk present and cooldown passed',
      details: verbose ? { knownPests: knownPestsCount } : undefined,
      candidate,
    };
  }
}
