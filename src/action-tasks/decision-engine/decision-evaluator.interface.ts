import { DecisionCandidate, PlantingDecisionContext } from './decision.types';

export interface DecisionEvaluator {
  evaluate(context: PlantingDecisionContext): DecisionCandidate[];
}
