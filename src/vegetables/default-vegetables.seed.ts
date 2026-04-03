import { EntityName, FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTemplate } from '../action-templates/action-template.entity';
import {
  NutrientNeeds,
  RotationGroup,
  VegetableFamily,
} from '../common/enums/vegetable.enums';
import { toSlug } from '../common/utils/slug.util';
import { Disease } from '../diseases/disease.entity';
import { Pest } from '../pests/pest.entity';
import { Soil } from '../soils/soil.entity';
import { VegetableActionRule } from './vegetable-action-rule.entity';
import { Vegetable } from './vegetable.entity';
import {
  CreateVegetableDto,
  VegetableActionRuleDto,
} from './dto/vegetable.schemas';
import vegetablesSeedData from './vegetables-seed-data.json';

type SeedRecord = CreateVegetableDto & { name: string; description: string };

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const DEFAULT_VEGETABLES: readonly SeedRecord[] =
  vegetablesSeedData as unknown as SeedRecord[];

async function loadByRefs<T extends { id: string; slug: string }>(
  em: EntityManager,
  entity: EntityName<T>,
  refs: string[] | undefined,
  context: string,
  warn?: (msg: string) => void,
): Promise<T[]> {
  if (!refs?.length) return [];

  const cleanRefs = refs.filter(isString).map((r) => r.trim());
  if (!cleanRefs.length) return [];

  const items = await em.find(entity, {
    slug: { $in: cleanRefs },
  } as unknown as FilterQuery<T>);

  for (const ref of cleanRefs) {
    if (!items.some((it) => it.slug === ref)) {
      warn?.(`[VegetablesSeed] Missing reference "${ref}" for ${context}`);
    }
  }

  return items;
}

async function replaceActionRules(
  em: EntityManager,
  vegetable: Vegetable,
  rules: VegetableActionRuleDto[] | undefined,
  warn?: (msg: string) => void,
): Promise<void> {
  const existingRules = await em.find(VegetableActionRule, { vegetable });
  if (existingRules.length > 0) {
    em.remove(existingRules);
  }

  if (!rules?.length) return;

  for (const ruleSeed of rules) {
    const actionTemplate = await em.findOne(ActionTemplate, {
      slug: ruleSeed.actionTemplateSlug,
    });

    if (!actionTemplate) {
      warn?.(
        `[VegetablesSeed] Missing actionTemplate "${ruleSeed.actionTemplateSlug}" for ${vegetable.name}`,
      );
      continue;
    }

    const rule = new VegetableActionRule();
    rule.vegetable = vegetable;
    rule.actionTemplate = actionTemplate;
    rule.trigger = ruleSeed.trigger;
    rule.offsetDays = ruleSeed.offsetDays ?? 0;
    rule.schedule = ruleSeed.schedule;
    rule.everyNDays = ruleSeed.everyNDays ?? null;
    rule.occurrencesLimit = ruleSeed.occurrencesLimit ?? null;
    rule.applyIfStartMethod = ruleSeed.applyIfStartMethod ?? null;
    rule.isEnabled = ruleSeed.isEnabled ?? true;

    em.persist(rule);
  }
}

export async function upsertDefaultVegetables(
  em: EntityManager,
  warn?: (msg: string) => void,
): Promise<void> {
  const BATCH_SIZE = 20;

  for (let i = 0; i < DEFAULT_VEGETABLES.length; i += BATCH_SIZE) {
    const batch = DEFAULT_VEGETABLES.slice(i, i + BATCH_SIZE);

    for (const seed of batch) {
      const slug = toSlug(seed.name);

      let vegetable = await em.findOne(Vegetable, { slug });
      if (!vegetable) {
        vegetable = await em.findOne(Vegetable, {
          name: { $ilike: seed.name },
        });
      }
      if (!vegetable) {
        vegetable = new Vegetable();
      } else if (vegetable.isCustomized) {
        continue;
      }

      vegetable.name = seed.name;
      vegetable.slug = slug;
      vegetable.description = seed.description;
      vegetable.latinName = seed.latinName ?? null;
      vegetable.imageUrl = seed.imageUrl ?? null;
      vegetable.sunExposure = seed.sunExposure ?? null;
      vegetable.waterDemand = seed.waterDemand ?? null;
      vegetable.nutrientDemand = seed.nutrientDemand ?? null;
      vegetable.family = seed.family ?? VegetableFamily.OTHER;
      vegetable.botanicalFamily = seed.botanicalFamily ?? null;
      vegetable.nutrientNeeds = seed.nutrientNeeds ?? NutrientNeeds.MEDIUM;
      vegetable.rotationGroup = seed.rotationGroup ?? RotationGroup.OTHER;
      vegetable.minSoilDepthCm = seed.minSoilDepthCm ?? null;
      vegetable.dominantNutrientDemand = seed.dominantNutrientDemand ?? null;
      vegetable.sowingMethods = seed.sowingMethods ?? null;
      vegetable.timeToHarvestDaysMin = seed.timeToHarvestDaysMin ?? null;
      vegetable.timeToHarvestDaysMax = seed.timeToHarvestDaysMax ?? null;
      vegetable.successionSowing = seed.successionSowing ?? false;
      vegetable.successionIntervalDays = seed.successionIntervalDays ?? null;
      vegetable.harvestStartMonth = seed.harvestStartMonth ?? null;
      vegetable.harvestEndMonth = seed.harvestEndMonth ?? null;
      vegetable.harvestSigns = seed.harvestSigns ?? null;
      vegetable.fertilizationStages = seed.fertilizationStages ?? null;

      const [soils, pests, diseases] = await Promise.all([
        loadByRefs(
          em,
          Soil,
          seed.recommendedSoilSlugs,
          `${seed.name} recommendedSoilSlugs`,
          warn,
        ),
        loadByRefs(
          em,
          Pest,
          seed.commonPestSlugs,
          `${seed.name} commonPestSlugs`,
          warn,
        ),
        loadByRefs(
          em,
          Disease,
          seed.commonDiseaseSlugs,
          `${seed.name} commonDiseaseSlugs`,
          warn,
        ),
      ]);

      vegetable.recommendedSoils.set(soils);
      vegetable.commonPests.set(pests);
      vegetable.commonDiseases.set(diseases);

      em.persist(vegetable);
    }

    await em.flush();
    em.clear();
  }

  for (let i = 0; i < DEFAULT_VEGETABLES.length; i += BATCH_SIZE) {
    const batch = DEFAULT_VEGETABLES.slice(i, i + BATCH_SIZE);

    for (const seed of batch) {
      const slug = toSlug(seed.name);
      const vegetable = await em.findOne(Vegetable, { slug });
      if (!vegetable || vegetable.isCustomized) continue;

      const [goodCompanions, badCompanions] = await Promise.all([
        loadByRefs(
          em,
          Vegetable,
          seed.goodCompanionSlugs,
          `${seed.name} goodCompanionSlugs`,
          warn,
        ),
        loadByRefs(
          em,
          Vegetable,
          seed.badCompanionSlugs,
          `${seed.name} badCompanionSlugs`,
          warn,
        ),
      ]);

      vegetable.goodCompanions.set(
        goodCompanions.filter((companion) => companion.id !== vegetable.id),
      );
      vegetable.badCompanions.set(
        badCompanions.filter((companion) => companion.id !== vegetable.id),
      );

      await replaceActionRules(em, vegetable, seed.actionRules, warn);
      em.persist(vegetable);
    }

    await em.flush();
    em.clear();
  }
}
