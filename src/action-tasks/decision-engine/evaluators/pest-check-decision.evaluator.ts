import { normalizeDueAt } from '../../../common/types/date-utils';
import { DecisionEvaluator } from '../decision-evaluator.interface';
import {
  hasCompletedDecisionToday,
  hasPendingDecisionTask,
} from '../decision-context.helpers';
import { DecisionCandidate, PlantingDecisionContext } from '../decision.types';

export class PestCheckDecisionEvaluator implements DecisionEvaluator {
  evaluate(context: PlantingDecisionContext): DecisionCandidate[] {
    if (hasPendingDecisionTask(context, 'PEST_CHECK')) {
      return [];
    }

    if (hasCompletedDecisionToday(context, 'PEST_CHECK')) {
      return [];
    }

    const hasKnownPestRisk = context.planting.vegetable.commonPests.length > 0;
    if (!hasKnownPestRisk) {
      return [];
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
      return [];
    }

    return [
      {
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
      },
    ];
  }
}
