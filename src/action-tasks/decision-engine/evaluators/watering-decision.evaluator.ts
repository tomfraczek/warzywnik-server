import { DemandLevel } from '../../../common/enums/vegetable.enums';
import { DecisionEvaluator } from '../decision-evaluator.interface';
import { DecisionCandidate, PlantingDecisionContext } from '../decision.types';
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
    if (hasPendingDecisionTask(context, 'WATERING')) {
      return [];
    }

    if (hasCompletedDecisionToday(context, 'WATERING')) {
      return [];
    }

    const highHeat = (context.forecastMaxTemp24h ?? 0) >= 30;

    if (hasCompletedDecisionYesterday(context, 'WATERING') && !highHeat) {
      return [];
    }

    if (hasRecentCanceledDecisionTask(context, 'WATERING', 2)) {
      return [];
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
      return [];
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
      return [];
    }

    return [
      {
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
      },
    ];
  }
}
