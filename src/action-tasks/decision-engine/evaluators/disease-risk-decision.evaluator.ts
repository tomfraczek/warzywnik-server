import { WarningCode } from '../../../common/enums/warning.enums';
import { normalizeDueAt } from '../../../common/types/date-utils';
import { DecisionEvaluator } from '../decision-evaluator.interface';
import {
  hasCompletedDecisionToday,
  hasPendingDecisionTask,
} from '../decision-context.helpers';
import { DecisionCandidate, PlantingDecisionContext } from '../decision.types';

export class DiseaseRiskDecisionEvaluator implements DecisionEvaluator {
  evaluate(context: PlantingDecisionContext): DecisionCandidate[] {
    if (hasPendingDecisionTask(context, 'DISEASE_CHECK')) {
      return [];
    }

    if (hasCompletedDecisionToday(context, 'DISEASE_CHECK')) {
      return [];
    }

    const hasKnownDiseaseRisk =
      context.planting.vegetable.commonDiseases.length > 0;

    const hasWeatherRisk = context.activeWarnings.some((warning) =>
      [
        WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH,
        WarningCode.HEAVY_RAIN_TODAY_DAY,
        WarningCode.HEAVY_RAIN_TODAY_NIGHT,
        WarningCode.HEAVY_RAIN_TOMORROW_DAY,
        WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
        WarningCode.OVERWATERING_RISK,
      ].includes(warning.code),
    );

    if (!hasKnownDiseaseRisk || !hasWeatherRisk) {
      return [];
    }

    return [
      {
        decisionType: 'DISEASE_CHECK',
        targetType: 'planting',
        plantingId: context.planting.id,
        bedId: context.planting.bed.id,
        priority: 'high',
        dueAt: normalizeDueAt(context.now, context.planting.timelineTimezone),
        reason: 'Podwyższone ryzyko chorób (wilgoć/opady) dla podatnej uprawy.',
        confidence: 'high',
        sourceKey: `decision:disease-check:${context.planting.id}`,
        actionTemplateSlug: 'kontrola-chorob',
        shouldCreateTask: true,
      },
    ];
  }
}
