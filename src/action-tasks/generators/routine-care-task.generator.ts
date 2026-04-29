import { ActionRuleTrigger } from '../../common/enums/action.enums';
import { buildAutomationSourceKey } from './source-key.util';
import {
  GeneratedTaskCandidate,
  GeneratorContext,
} from './task-generation.types';

export class RoutineCareTaskGenerator {
  generate(
    context: GeneratorContext,
    resolveRuleBaseDueAt: (ruleId: string) => Date | null,
    buildRoutineOccurrences: (
      ruleId: string,
      firstDueAt: Date,
    ) => {
      cycleIndex: number;
      dueAt: Date;
    }[],
  ): GeneratedTaskCandidate[] {
    const candidates: GeneratedTaskCandidate[] = [];

    for (const rule of context.rules) {
      if (rule.trigger === ActionRuleTrigger.ON_HARVEST_CONFIRMED) continue;

      const mode = String(
        (rule.actionTemplate as { generationMode?: string }).generationMode ??
          'AUTO',
      );
      const isRoutineRule =
        mode === 'ROUTINE' || rule.schedule === 'EVERY_N_DAYS';
      if (!isRoutineRule) continue;

      const baseDueAt = resolveRuleBaseDueAt(rule.id);
      if (!baseDueAt) continue;

      const occurrences = buildRoutineOccurrences(rule.id, baseDueAt);

      for (const occurrence of occurrences) {
        candidates.push({
          kind: 'ROUTINE',
          trigger: rule.trigger,
          dueAt: occurrence.dueAt,
          cycleIndex: occurrence.cycleIndex,
          rule,
          sourceKey: buildAutomationSourceKey({
            plantingId: context.planting.id,
            templateId: rule.actionTemplate.id,
            trigger: rule.trigger,
            dueAt: occurrence.dueAt,
          }),
        });
      }
    }

    return candidates;
  }
}
