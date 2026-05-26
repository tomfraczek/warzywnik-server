import { ActionRuleTrigger } from '../../common/enums/action.enums';
import { buildAutomationSourceKey } from './source-key.util';
import {
  GeneratedTaskCandidate,
  GeneratorContext,
} from './task-generation.types';

export class PlantingLifecycleTaskGenerator {
  generate(
    context: GeneratorContext,
    resolveRuleBaseDueAt: (ruleId: string) => Date | null,
    buildOnceOccurrence: (
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
      // Only AUTO mode generates lifecycle tasks in the active planner.
      // WEATHER_TRIGGERED and SEASONAL belong to weather alerts / seasonal
      // checklists respectively, not to the active task queue.
      if (mode !== 'AUTO') {
        continue;
      }

      const baseDueAt = resolveRuleBaseDueAt(rule.id);
      if (!baseDueAt) continue;

      const occurrences = buildOnceOccurrence(rule.id, baseDueAt);

      for (const occurrence of occurrences) {
        candidates.push({
          kind: 'LIFECYCLE',
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
