import { PlantingStatus } from '../../../common/enums/planting.enums';
import { normalizeDueAt } from '../../../common/types/date-utils';
import { DecisionEvaluator } from '../decision-evaluator.interface';
import {
  hasPendingDecisionTask,
  hasCompletedDecisionToday,
} from '../decision-context.helpers';
import { DecisionCandidate, PlantingDecisionContext } from '../decision.types';

export class HarvestReadinessDecisionEvaluator implements DecisionEvaluator {
  evaluate(context: PlantingDecisionContext): DecisionCandidate[] {
    if (hasPendingDecisionTask(context, 'HARVEST_CHECK')) {
      return [];
    }

    if (hasCompletedDecisionToday(context, 'HARVEST_CHECK')) {
      return [];
    }

    if (
      context.planting.status === PlantingStatus.HARVESTED ||
      context.planting.status === PlantingStatus.CLEARED ||
      context.planting.status === PlantingStatus.FAILED ||
      context.planting.status === PlantingStatus.CANCELLED
    ) {
      return [];
    }

    const dueAt = normalizeDueAt(
      context.now,
      context.planting.timelineTimezone,
    );

    if (context.planting.status === PlantingStatus.READY_FOR_FINAL_HARVEST) {
      return [
        {
          decisionType: 'HARVEST_CHECK',
          targetType: 'planting',
          plantingId: context.planting.id,
          bedId: context.planting.bed.id,
          priority: 'high',
          dueAt,
          reason: 'Uprawa jest gotowa do końcowego zbioru.',
          confidence: 'high',
          sourceKey: `decision:harvest-check:${context.planting.id}`,
          actionTemplateSlug: 'kontrola-gotowosci-do-zbioru',
          shouldCreateTask: true,
        },
      ];
    }

    if (
      context.planting.status === PlantingStatus.IN_GROUND &&
      context.planting.harvestWindowStart &&
      context.planting.harvestWindowStart.getTime() - context.now.getTime() <=
        3 * 24 * 60 * 60 * 1000
    ) {
      return [
        {
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
        },
      ];
    }

    return [];
  }
}
