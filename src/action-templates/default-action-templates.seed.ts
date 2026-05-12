import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTemplate } from './action-template.entity';
import actionTemplatesSeedData from './default-action-templates.seed-data.json';
import {
  ActionTemplateAggregationScope,
  ActionTemplateEnvironment,
  ActionTemplateGenerationMode,
  ActionTemplatePriority,
  ActionTemplateTarget,
  ActionTemplateType,
} from '../common/enums/action.enums';
import { toSlug } from '../common/utils/slug.util';

type ActionTemplateSeedRecord = {
  name: string;
  description: string | null;
  isUserSelectable?: boolean;
  target: ActionTemplateTarget;
  environment: ActionTemplateEnvironment;
  type: ActionTemplateType;
  generationMode?: ActionTemplateGenerationMode;
  priority?: ActionTemplatePriority;
  aggregationScope?: ActionTemplateAggregationScope;
  maxAutoOccurrencesPerPlanting?: number | null;
  minDaysBetweenOccurrences?: number | null;
  requiresUserConfirmation?: boolean;
  defaultDueOffsetDays: number | null;
};

export const DEFAULT_ACTION_TEMPLATES: readonly ActionTemplateSeedRecord[] =
  actionTemplatesSeedData as readonly ActionTemplateSeedRecord[];

const resolveIsUserSelectable = (item: ActionTemplateSeedRecord) => {
  if (item.isUserSelectable !== undefined) {
    return item.isUserSelectable;
  }

  return true;
};

export const upsertDefaultActionTemplates = async (
  em: EntityManager,
): Promise<void> => {
  for (const item of DEFAULT_ACTION_TEMPLATES) {
    const slug = toSlug(item.name);
    const existingBySlug = await em.findOne(ActionTemplate, { slug });
    if (existingBySlug) {
      existingBySlug.name = item.name;
      existingBySlug.description = item.description;
      existingBySlug.target = item.target;
      existingBySlug.environment = item.environment;
      existingBySlug.type = item.type;
      existingBySlug.generationMode =
        item.generationMode ?? ActionTemplateGenerationMode.AUTO;
      existingBySlug.priority = item.priority ?? ActionTemplatePriority.MEDIUM;
      existingBySlug.aggregationScope =
        item.aggregationScope ?? ActionTemplateAggregationScope.NONE;
      existingBySlug.maxAutoOccurrencesPerPlanting =
        item.maxAutoOccurrencesPerPlanting ?? null;
      existingBySlug.minDaysBetweenOccurrences =
        item.minDaysBetweenOccurrences ?? null;
      existingBySlug.requiresUserConfirmation =
        item.requiresUserConfirmation ?? false;
      existingBySlug.defaultDueOffsetDays = item.defaultDueOffsetDays;
      existingBySlug.isUserSelectable = resolveIsUserSelectable(item);
      continue;
    }

    const existingExact = await em.findOne(ActionTemplate, {
      name: { $ilike: item.name },
      target: item.target,
      environment: item.environment,
      type: item.type,
    });

    if (existingExact) {
      existingExact.slug = slug;
      existingExact.name = item.name;
      existingExact.description = item.description;
      existingExact.generationMode =
        item.generationMode ?? ActionTemplateGenerationMode.AUTO;
      existingExact.priority = item.priority ?? ActionTemplatePriority.MEDIUM;
      existingExact.aggregationScope =
        item.aggregationScope ?? ActionTemplateAggregationScope.NONE;
      existingExact.maxAutoOccurrencesPerPlanting =
        item.maxAutoOccurrencesPerPlanting ?? null;
      existingExact.minDaysBetweenOccurrences =
        item.minDaysBetweenOccurrences ?? null;
      existingExact.requiresUserConfirmation =
        item.requiresUserConfirmation ?? false;
      existingExact.defaultDueOffsetDays = item.defaultDueOffsetDays;
      existingExact.isUserSelectable = resolveIsUserSelectable(item);
      continue;
    }

    const existingByName = await em.findOne(ActionTemplate, {
      name: { $ilike: item.name },
    });

    if (existingByName) {
      existingByName.name = item.name;
      existingByName.slug = slug;
      existingByName.target = item.target;
      existingByName.environment = item.environment;
      existingByName.type = item.type;
      existingByName.generationMode =
        item.generationMode ?? ActionTemplateGenerationMode.AUTO;
      existingByName.priority = item.priority ?? ActionTemplatePriority.MEDIUM;
      existingByName.aggregationScope =
        item.aggregationScope ?? ActionTemplateAggregationScope.NONE;
      existingByName.maxAutoOccurrencesPerPlanting =
        item.maxAutoOccurrencesPerPlanting ?? null;
      existingByName.minDaysBetweenOccurrences =
        item.minDaysBetweenOccurrences ?? null;
      existingByName.requiresUserConfirmation =
        item.requiresUserConfirmation ?? false;
      existingByName.description = item.description;
      existingByName.defaultDueOffsetDays = item.defaultDueOffsetDays;
      existingByName.isUserSelectable = resolveIsUserSelectable(item);
      continue;
    }

    const template = new ActionTemplate();
    template.name = item.name;
    template.slug = slug;
    template.description = item.description;
    template.target = item.target;
    template.environment = item.environment;
    template.type = item.type;
    template.generationMode =
      item.generationMode ?? ActionTemplateGenerationMode.AUTO;
    template.priority = item.priority ?? ActionTemplatePriority.MEDIUM;
    template.aggregationScope =
      item.aggregationScope ?? ActionTemplateAggregationScope.NONE;
    template.maxAutoOccurrencesPerPlanting =
      item.maxAutoOccurrencesPerPlanting ?? null;
    template.minDaysBetweenOccurrences = item.minDaysBetweenOccurrences ?? null;
    template.requiresUserConfirmation = item.requiresUserConfirmation ?? false;
    template.defaultDueOffsetDays = item.defaultDueOffsetDays;
    template.isUserSelectable = resolveIsUserSelectable(item);

    em.persist(template);
  }

  await em.flush();
};
