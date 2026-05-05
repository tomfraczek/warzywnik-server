import { DecisionEvaluator } from './decision-evaluator.interface';
import { DecisionCandidate, PlantingDecisionContext } from './decision.types';
import { WateringDecisionEvaluator } from './evaluators/watering-decision.evaluator';
import { MoistureCheckDecisionEvaluator } from './evaluators/moisture-check-decision.evaluator';
import { PestCheckDecisionEvaluator } from './evaluators/pest-check-decision.evaluator';
import { DiseaseRiskDecisionEvaluator } from './evaluators/disease-risk-decision.evaluator';
import { HarvestReadinessDecisionEvaluator } from './evaluators/harvest-readiness-decision.evaluator';
import { PlantingStatus } from '../../common/enums/planting.enums';

export class GardenDecisionEngine {
  private readonly evaluators: DecisionEvaluator[];

  constructor(evaluators?: DecisionEvaluator[]) {
    this.evaluators = evaluators ?? [
      new HarvestReadinessDecisionEvaluator(),
      new WateringDecisionEvaluator(),
      new MoistureCheckDecisionEvaluator(),
      new PestCheckDecisionEvaluator(),
      new DiseaseRiskDecisionEvaluator(),
    ];
  }

  evaluate(context: PlantingDecisionContext): DecisionCandidate[] {
    if (
      context.planting.status === PlantingStatus.HARVESTED ||
      context.planting.status === PlantingStatus.CLEARED ||
      context.planting.status === PlantingStatus.FAILED ||
      context.planting.status === PlantingStatus.CANCELLED ||
      context.planting.status === PlantingStatus.NEW
    ) {
      return [];
    }

    const byKey = new Map<string, DecisionCandidate>();

    for (const evaluator of this.evaluators) {
      const decisions = evaluator.evaluate(context);

      for (const decision of decisions) {
        if (!decision.shouldCreateTask) continue;
        if (!decision.sourceKey) continue;
        if (!byKey.has(decision.sourceKey)) {
          byKey.set(decision.sourceKey, decision);
        }
      }
    }

    const decisions = Array.from(byKey.values());

    if (context.planting.status === PlantingStatus.READY_FOR_FINAL_HARVEST) {
      return decisions.filter(
        (decision) => decision.decisionType === 'HARVEST_CHECK',
      );
    }

    return decisions;
  }
}
