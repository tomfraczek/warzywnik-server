import { DecisionEvaluator } from './decision-evaluator.interface';
import {
  DecisionCandidate,
  DecisionEvaluationTrace,
  PlantingDecisionContext,
} from './decision.types';
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
    const traces = this.evaluateWithTrace(context, false);
    return traces
      .filter(
        (
          trace,
        ): trace is DecisionEvaluationTrace & {
          candidate: DecisionCandidate;
        } => trace.result === 'CREATED' && Boolean(trace.candidate),
      )
      .map((trace) => trace.candidate);
  }

  evaluateWithTrace(
    context: PlantingDecisionContext,
    verbose = false,
  ): DecisionEvaluationTrace[] {
    if (
      context.planting.status === PlantingStatus.HARVESTED ||
      context.planting.status === PlantingStatus.CLEARED ||
      context.planting.status === PlantingStatus.FAILED ||
      context.planting.status === PlantingStatus.CANCELLED ||
      context.planting.status === PlantingStatus.NEW
    ) {
      return this.evaluators.map((evaluator) => ({
        evaluator: evaluator.constructor.name,
        decisionType: 'GENERAL_MONITORING',
        result: 'SKIPPED' as const,
        reason: `skipped: lifecycle status ${context.planting.status}`,
      }));
    }

    const byKey = new Map<string, DecisionEvaluationTrace>();

    for (const evaluator of this.evaluators) {
      const trace = evaluator.evaluateWithTrace(context, verbose);

      if (trace.result !== 'CREATED' || !trace.candidate) {
        byKey.set(`${trace.evaluator}:${trace.decisionType}`, trace);
        continue;
      }

      if (!trace.candidate.shouldCreateTask || !trace.candidate.sourceKey) {
        byKey.set(`${trace.evaluator}:${trace.decisionType}`, {
          ...trace,
          result: 'SKIPPED',
          reason: 'skipped: shouldCreateTask=false or empty sourceKey',
        });
        continue;
      }

      if (!byKey.has(trace.candidate.sourceKey)) {
        byKey.set(trace.candidate.sourceKey, trace);
      } else {
        byKey.set(`${trace.evaluator}:${trace.decisionType}`, {
          evaluator: trace.evaluator,
          decisionType: trace.decisionType,
          result: 'SKIPPED',
          reason: 'skipped: duplicate sourceKey already accepted',
          details: verbose
            ? { sourceKey: trace.candidate.sourceKey }
            : undefined,
        });
      }
    }

    const traces = Array.from(byKey.values());

    if (context.planting.status === PlantingStatus.READY_FOR_FINAL_HARVEST) {
      return traces.map((trace) => {
        if (
          trace.result === 'CREATED' &&
          trace.candidate?.decisionType !== 'HARVEST_CHECK'
        ) {
          return {
            evaluator: trace.evaluator,
            decisionType: trace.decisionType,
            result: 'SKIPPED' as const,
            reason:
              'skipped: READY_FOR_FINAL_HARVEST allows only HARVEST_CHECK',
            details: verbose ? trace.details : undefined,
          };
        }
        return trace;
      });
    }

    return traces;
  }
}
