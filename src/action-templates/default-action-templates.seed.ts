import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTemplate } from './action-template.entity';
import actionTemplatesSeedData from './default-action-templates.seed-data.json';
import {
  ActionTemplateEnvironment,
  ActionTemplateTarget,
  ActionTemplateType,
} from '../common/enums/action.enums';
import { toSlug } from '../common/utils/slug.util';

type ActionTemplateSeedRecord = {
  name: string;
  description: string | null;
  target: ActionTemplateTarget;
  environment: ActionTemplateEnvironment;
  type: ActionTemplateType;
  defaultDueOffsetDays: number | null;
};

export const DEFAULT_ACTION_TEMPLATES: readonly ActionTemplateSeedRecord[] =
  actionTemplatesSeedData as readonly ActionTemplateSeedRecord[];

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
      existingBySlug.defaultDueOffsetDays = item.defaultDueOffsetDays;
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
      existingExact.defaultDueOffsetDays = item.defaultDueOffsetDays;
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
      existingByName.description = item.description;
      existingByName.defaultDueOffsetDays = item.defaultDueOffsetDays;
      continue;
    }

    const template = new ActionTemplate();
    template.name = item.name;
    template.slug = slug;
    template.description = item.description;
    template.target = item.target;
    template.environment = item.environment;
    template.type = item.type;
    template.defaultDueOffsetDays = item.defaultDueOffsetDays;

    em.persist(template);
  }

  await em.flush();
};
