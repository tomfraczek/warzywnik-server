import { ActionRuleTrigger } from '../../common/enums/action.enums';
import { VegetableActionRule } from '../../vegetables/vegetable-action-rule.entity';

export class PostHarvestPromptGenerator {
  generate(rules: VegetableActionRule[]) {
    return rules
      .filter((rule) => {
        if (rule.trigger !== ActionRuleTrigger.ON_HARVEST_CONFIRMED) {
          return false;
        }

        const mode = String(
          (rule.actionTemplate as { generationMode?: string }).generationMode ??
            'POST_HARVEST_PROMPT',
        );

        return mode === 'POST_HARVEST_PROMPT' || mode === 'SUGGESTION';
      })
      .map((rule) => ({
        actionTemplate: {
          id: rule.actionTemplate.id,
          name: rule.actionTemplate.name,
          scope: rule.actionTemplate.target,
          target: rule.actionTemplate.target,
          environment: rule.actionTemplate.environment,
          type: rule.actionTemplate.type,
          description: rule.actionTemplate.description ?? null,
          defaultDueOffsetDays: rule.actionTemplate.defaultDueOffsetDays,
        },
        offsetDays: rule.offsetDays,
        schedule: rule.schedule,
        everyNDays: rule.everyNDays ?? null,
        occurrencesLimit: rule.occurrencesLimit ?? null,
      }));
  }
}
