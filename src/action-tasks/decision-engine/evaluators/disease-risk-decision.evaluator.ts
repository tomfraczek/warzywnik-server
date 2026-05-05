import { WarningCode } from '../../../common/enums/warning.enums';
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

export class DiseaseRiskDecisionEvaluator implements DecisionEvaluator {
  private getKnownDiseasesCount(context: PlantingDecisionContext): number {
    const diseases = context.planting.vegetable.commonDiseases as unknown;
    if (Array.isArray(diseases)) {
      return diseases.length;
    }

    const collection = diseases as {
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
    if (hasPendingDecisionTask(context, 'DISEASE_CHECK')) {
      return {
        evaluator: 'DiseaseRiskDecisionEvaluator',
        decisionType: 'DISEASE_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: existing pending task',
      };
    }

    if (hasCompletedDecisionToday(context, 'DISEASE_CHECK')) {
      return {
        evaluator: 'DiseaseRiskDecisionEvaluator',
        decisionType: 'DISEASE_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: disease check done today',
      };
    }

    const knownDiseasesCount = this.getKnownDiseasesCount(context);
    const hasKnownDiseaseRisk = knownDiseasesCount > 0;

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
      return {
        evaluator: 'DiseaseRiskDecisionEvaluator',
        decisionType: 'DISEASE_CHECK',
        result: 'SKIPPED',
        reason: !hasKnownDiseaseRisk
          ? 'skipped: no mapped disease risk for vegetable'
          : 'skipped: no active weather disease pressure',
        details: verbose
          ? {
              hasKnownDiseaseRisk,
              hasWeatherRisk,
              warnings: context.activeWarnings.map((item) => item.code),
            }
          : undefined,
      };
    }

    const candidate: DecisionCandidate = {
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
    };

    return {
      evaluator: 'DiseaseRiskDecisionEvaluator',
      decisionType: 'DISEASE_CHECK',
      result: 'CREATED',
      reason: 'created: high disease pressure from active warnings',
      details: verbose
        ? {
            warnings: context.activeWarnings.map((item) => item.code),
            knownDiseases: knownDiseasesCount,
          }
        : undefined,
      candidate,
    };
  }
}
