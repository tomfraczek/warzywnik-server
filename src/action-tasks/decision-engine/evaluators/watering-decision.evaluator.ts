import { DemandLevel } from '../../../common/enums/vegetable.enums';
import { DecisionEvaluator } from '../decision-evaluator.interface';
import {
  DecisionCandidate,
  DecisionEvaluationTrace,
  PlantingDecisionContext,
} from '../decision.types';
import {
  hasCompletedDecisionToday,
  hasCompletedDecisionYesterday,
  hasPendingDecisionTask,
  hasRecentCanceledDecisionTask,
  lastCompletedDecisionAt,
} from '../decision-context.helpers';
import { normalizeDueAt } from '../../../common/types/date-utils';
import {
  DrainageLevel,
  DemandLevel as SoilDemandLevel,
} from '../../../common/enums/soil.enums';

const DAY_MS = 24 * 60 * 60 * 1000;

export class WateringDecisionEvaluator implements DecisionEvaluator {
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
    if (hasPendingDecisionTask(context, 'WATERING')) {
      return {
        evaluator: 'WateringDecisionEvaluator',
        decisionType: 'WATERING',
        result: 'SKIPPED',
        reason: 'skipped: existing pending task',
      };
    }

    if (hasCompletedDecisionToday(context, 'WATERING')) {
      return {
        evaluator: 'WateringDecisionEvaluator',
        decisionType: 'WATERING',
        result: 'SKIPPED',
        reason: 'skipped: watered today',
      };
    }

    const highHeat = (context.forecastMaxTemp24h ?? 0) >= 30;

    if (hasCompletedDecisionYesterday(context, 'WATERING') && !highHeat) {
      return {
        evaluator: 'WateringDecisionEvaluator',
        decisionType: 'WATERING',
        result: 'SKIPPED',
        reason: 'skipped: watered yesterday and no high heat',
      };
    }

    if (hasRecentCanceledDecisionTask(context, 'WATERING', 2)) {
      return {
        evaluator: 'WateringDecisionEvaluator',
        decisionType: 'WATERING',
        result: 'SKIPPED',
        reason: 'skipped: recently canceled by user',
      };
    }

    const waterDemand = context.planting.vegetable.waterDemand;
    const retention = context.planting.bed.soil?.waterRetention;
    const drainage = context.planting.bed.soil?.drainage;

    const retentionPenalty = retention === SoilDemandLevel.HIGH ? 2 : 0;
    const drainagePenalty = drainage === DrainageLevel.POOR ? 2 : 0;
    const demandBoost =
      waterDemand === DemandLevel.HIGH
        ? 3
        : waterDemand === DemandLevel.MEDIUM
          ? 1
          : 0;

    const dryRecent =
      context.recentPrecipMm24h < 2 && context.recentPrecipMm72h < 6;
    const noForecastRain = context.forecastPrecipMm48h < 2;
    const uncertainWatering =
      context.recentPrecipMm72h >= 3 &&
      context.recentPrecipMm72h <= 10 &&
      noForecastRain &&
      !highHeat;

    if (uncertainWatering) {
      return {
        evaluator: 'WateringDecisionEvaluator',
        decisionType: 'WATERING',
        result: 'SKIPPED',
        reason: 'skipped: uncertain watering, prefer moisture check',
      };
    }

    const lastWateringAt = lastCompletedDecisionAt(context, 'WATERING');
    const daysSinceWatering = lastWateringAt
      ? (context.now.getTime() - lastWateringAt.getTime()) / DAY_MS
      : Number.POSITIVE_INFINITY;

    const drynessScore =
      (dryRecent ? 2 : 0) +
      (noForecastRain ? 2 : 0) +
      (highHeat ? 2 : 0) +
      (daysSinceWatering >= 2 ? 2 : 0) +
      demandBoost -
      retentionPenalty -
      drainagePenalty;

    if (drynessScore < 4) {
      return {
        evaluator: 'WateringDecisionEvaluator',
        decisionType: 'WATERING',
        result: 'SKIPPED',
        reason: 'skipped: not enough drought evidence',
        details: verbose
          ? {
              drynessScore,
              waterDemand,
              retention,
              drainage,
              recentPrecipMm24h: context.recentPrecipMm24h,
              recentPrecipMm72h: context.recentPrecipMm72h,
              forecastPrecipMm48h: context.forecastPrecipMm48h,
              forecastMaxTemp24h: context.forecastMaxTemp24h,
              daysSinceWatering,
            }
          : undefined,
      };
    }

    const candidate: DecisionCandidate = {
      decisionType: 'WATERING',
      targetType: 'planting',
      plantingId: context.planting.id,
      bedId: context.planting.bed.id,
      priority: drynessScore >= 7 ? 'high' : 'medium',
      dueAt: normalizeDueAt(context.now, context.planting.timelineTimezone),
      reason:
        'Wysokie zapotrzebowanie wodne i warunki suszowe bez istotnych opadów.',
      confidence: drynessScore >= 7 ? 'high' : 'medium',
      sourceKey: `decision:watering:${context.planting.id}`,
      actionTemplateSlug: 'podlewanie',
      shouldCreateTask: true,
    };

    return {
      evaluator: 'WateringDecisionEvaluator',
      decisionType: 'WATERING',
      result: 'CREATED',
      reason: 'created: high water demand + no rain + watering overdue',
      details: verbose
        ? {
            drynessScore,
            waterDemand,
            retention,
            drainage,
            recentPrecipMm24h: context.recentPrecipMm24h,
            recentPrecipMm72h: context.recentPrecipMm72h,
            forecastPrecipMm48h: context.forecastPrecipMm48h,
            forecastMaxTemp24h: context.forecastMaxTemp24h,
            daysSinceWatering,
          }
        : undefined,
      candidate,
    };
  }
}
