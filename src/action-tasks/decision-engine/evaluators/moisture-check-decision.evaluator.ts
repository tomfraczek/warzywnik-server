import { DemandLevel } from '../../../common/enums/vegetable.enums';
import { normalizeDueAt } from '../../../common/types/date-utils';
import { DecisionEvaluator } from '../decision-evaluator.interface';
import {
  DecisionCandidate,
  DecisionEvaluationTrace,
  PlantingDecisionContext,
} from '../decision.types';
import {
  hasCompletedDecisionToday,
  hasPendingDecisionTask,
} from '../decision-context.helpers';
import { PlantingStatus } from '../../../common/enums/planting.enums';
import { WarningCode } from '../../../common/enums/warning.enums';

export class MoistureCheckDecisionEvaluator implements DecisionEvaluator {
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
    if (hasPendingDecisionTask(context, 'MOISTURE_CHECK')) {
      return {
        evaluator: 'MoistureCheckDecisionEvaluator',
        decisionType: 'MOISTURE_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: existing pending task',
      };
    }

    if (hasCompletedDecisionToday(context, 'MOISTURE_CHECK')) {
      return {
        evaluator: 'MoistureCheckDecisionEvaluator',
        decisionType: 'MOISTURE_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: moisture checked today',
      };
    }

    const waterDemand = context.planting.vegetable.waterDemand;
    const highTemp = (context.forecastMaxTemp24h ?? 0) >= 29;
    const droughtRiskWarning = context.activeWarnings.some(
      (warning) =>
        warning.code === WarningCode.DROUGHT_RISK_NEXT_7_DAYS ||
        warning.code === WarningCode.WATERING_NEEDED_TODAY ||
        warning.code === WarningCode.WATERING_NEEDED_TOMORROW,
    );

    const youngPlanting =
      (context.planting.status === PlantingStatus.IN_GROUND &&
        (!context.planting.sowedAt ||
          context.now.getTime() - context.planting.sowedAt.getTime() <
            8 * 24 * 60 * 60 * 1000)) ||
      (context.planting.transplantedAt != null &&
        context.now.getTime() - context.planting.transplantedAt.getTime() <
          7 * 24 * 60 * 60 * 1000);

    const uncertainWatering =
      context.recentPrecipMm72h >= 3 &&
      context.recentPrecipMm72h <= 10 &&
      context.forecastPrecipMm48h < 2;

    const noWateringHistory = context.recentCompletedActionEvents.every(
      (event) => event.payload?.actionType !== 'watering',
    );

    const reasonSignals = [
      youngPlanting,
      highTemp,
      droughtRiskWarning,
      uncertainWatering,
      noWateringHistory,
      waterDemand === DemandLevel.HIGH,
    ].filter(Boolean).length;

    if (reasonSignals < 2) {
      return {
        evaluator: 'MoistureCheckDecisionEvaluator',
        decisionType: 'MOISTURE_CHECK',
        result: 'SKIPPED',
        reason: 'skipped: insufficient signals for moisture check',
        details: verbose
          ? {
              reasonSignals,
              youngPlanting,
              highTemp,
              droughtRiskWarning,
              uncertainWatering,
              noWateringHistory,
              waterDemand,
            }
          : undefined,
      };
    }

    const candidate: DecisionCandidate = {
      decisionType: 'MOISTURE_CHECK',
      targetType: 'planting',
      plantingId: context.planting.id,
      bedId: context.planting.bed.id,
      priority: reasonSignals >= 4 ? 'high' : 'medium',
      dueAt: normalizeDueAt(context.now, context.planting.timelineTimezone),
      reason:
        'Występują przesłanki do diagnostycznej kontroli wilgotności przed podlewaniem.',
      confidence: uncertainWatering ? 'high' : 'medium',
      sourceKey: `decision:moisture-check:${context.planting.id}`,
      actionTemplateSlug: 'kontrola-wilgotnosci-gleby',
      shouldCreateTask: true,
    };

    return {
      evaluator: 'MoistureCheckDecisionEvaluator',
      decisionType: 'MOISTURE_CHECK',
      result: 'CREATED',
      reason:
        'created: uncertainty requires moisture diagnosis before watering',
      details: verbose
        ? {
            reasonSignals,
            youngPlanting,
            highTemp,
            droughtRiskWarning,
            uncertainWatering,
            noWateringHistory,
            waterDemand,
          }
        : undefined,
      candidate,
    };
  }
}
