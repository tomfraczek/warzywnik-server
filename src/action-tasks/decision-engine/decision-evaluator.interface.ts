import {
  DecisionCandidate,
  DecisionEvaluationTrace,
  PlantingDecisionContext,
} from './decision.types';

export interface DecisionEvaluator {
  evaluate(context: PlantingDecisionContext): DecisionCandidate[];
  evaluateWithTrace(
    context: PlantingDecisionContext,
    verbose?: boolean,
  ): DecisionEvaluationTrace;
}
