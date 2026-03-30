import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Collection, FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Vegetable } from './vegetable.entity';
import {
  VegetableFamily,
  NutrientNeeds,
  RotationGroup,
} from '../common/enums/vegetable.enums';
import { Pest } from '../pests/pest.entity';
import { Disease } from '../diseases/disease.entity';
import { Soil } from '../soils/soil.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { Planting } from '../plantings/planting.entity';
import {
  CreateVegetableDto,
  ListVegetablesQueryDto,
  UpdateVegetableDto,
} from './dto/vegetable.schemas';
import { VegetableActionRule } from './vegetable-action-rule.entity';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
} from '../common/enums/action.enums';
import { PlantingStartMethod } from '../common/enums/planting.enums';
import { toSlug } from '../common/utils/slug.util';

type VegetableActionRuleInput = {
  actionTemplateId: string;
  trigger: ActionRuleTrigger;
  offsetDays: number;
  schedule: ActionRuleSchedule;
  everyNDays?: number | null;
  occurrencesLimit?: number | null;
  applyIfStartMethod?: PlantingStartMethod[] | null;
  isEnabled?: boolean;
};

@Injectable()
export class VegetablesService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListVegetablesQueryDto) {
    const { page, limit, q, sunExposure, waterDemand, nutrientDemand } = query;
    const search = q?.trim();

    const where: FilterQuery<Vegetable> = {};

    if (sunExposure) where.sunExposure = sunExposure;
    if (waterDemand) where.waterDemand = waterDemand;
    if (nutrientDemand) where.nutrientDemand = nutrientDemand;

    if (search) {
      where.$or = [
        { name: { $ilike: `%${search}%` } },
        { latinName: { $ilike: `%${search}%` } },
        { description: { $ilike: `%${search}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(Vegetable, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
      populate: ['recommendedSoils'],
      fields: [
        'id',
        'name',
        'slug',
        'latinName',
        'imageUrl',
        'recommendedSoils',
        'family',
        'botanicalFamily',
        'nutrientNeeds',
        'rotationGroup',
        'minSoilDepthCm',
        'dominantNutrientDemand',
        'rulesVersion',
      ],
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        latinName: item.latinName ?? null,
        imageUrl: item.imageUrl ?? null,
        recommendedSoilIds: item.recommendedSoils
          .getItems()
          .map((soil) => soil.slug),
        family: item.family,
        botanicalFamily: item.botanicalFamily ?? null,
        nutrientNeeds: item.nutrientNeeds,
        rotationGroup: item.rotationGroup,
        minSoilDepthCm: item.minSoilDepthCm ?? null,
        dominantNutrientDemand: item.dominantNutrientDemand ?? null,
        rulesVersion: item.rulesVersion,
      })),
      page,
      limit,
      total,
    };
  }

  async getById(id: string) {
    const entity = await this.em.findOne(
      Vegetable,
      { id },
      {
        populate: [
          'recommendedSoils',
          'commonPests',
          'commonDiseases',
          'goodCompanions',
          'badCompanions',
          'actionRules',
          'actionRules.actionTemplate',
        ],
      },
    );

    if (!entity) {
      throw new NotFoundException('Vegetable not found');
    }

    return this.serializeVegetable(entity);
  }

  async create(dto: CreateVegetableDto) {
    const existing = await this.em.findOne(Vegetable, {
      name: { $ilike: dto.name },
    });
    if (existing) {
      throw new ConflictException('Vegetable name already exists');
    }

    const vegetable = new Vegetable();
    vegetable.name = dto.name;
    vegetable.slug = toSlug(dto.name);
    vegetable.description = dto.description;
    vegetable.latinName = dto.latinName ?? null;
    vegetable.imageUrl = dto.imageUrl ?? null;
    vegetable.sunExposure = dto.sunExposure ?? null;
    vegetable.waterDemand = dto.waterDemand ?? null;
    vegetable.nutrientDemand = dto.nutrientDemand ?? null;
    vegetable.sowingMethods = dto.sowingMethods ?? null;
    vegetable.timeToHarvestDaysMin = dto.timeToHarvestDaysMin ?? null;
    vegetable.timeToHarvestDaysMax = dto.timeToHarvestDaysMax ?? null;
    vegetable.successionSowing = dto.successionSowing ?? false;
    vegetable.successionIntervalDays = dto.successionIntervalDays ?? null;
    vegetable.harvestStartMonth = dto.harvestStartMonth ?? null;
    vegetable.harvestEndMonth = dto.harvestEndMonth ?? null;
    vegetable.harvestSigns = dto.harvestSigns ?? null;
    vegetable.fertilizationStages = dto.fertilizationStages ?? null;
    vegetable.family = dto.family ?? VegetableFamily.OTHER;
    vegetable.botanicalFamily = dto.botanicalFamily ?? null;
    vegetable.nutrientNeeds = dto.nutrientNeeds ?? NutrientNeeds.MEDIUM;
    vegetable.rotationGroup = dto.rotationGroup ?? RotationGroup.OTHER;
    vegetable.minSoilDepthCm = dto.minSoilDepthCm ?? null;
    vegetable.dominantNutrientDemand = dto.dominantNutrientDemand ?? null;

    if (dto.recommendedSoilIds !== undefined) {
      const soils = await this.loadSoilsByRefs(dto.recommendedSoilIds);
      vegetable.recommendedSoils.set(soils);
    }

    if (dto.commonPestIds) {
      const pests = await this.loadPestsByRefs(dto.commonPestIds);
      vegetable.commonPests.set(pests);
    }

    if (dto.commonDiseaseIds) {
      const diseases = await this.loadDiseasesByRefs(dto.commonDiseaseIds);
      vegetable.commonDiseases.set(diseases);
    }

    if (dto.goodCompanionIds) {
      const companions = await this.loadVegetablesByRefs(dto.goodCompanionIds);
      vegetable.goodCompanions.set(companions);
    }

    if (dto.badCompanionIds) {
      const companions = await this.loadVegetablesByRefs(dto.badCompanionIds);
      vegetable.badCompanions.set(companions);
    }

    const resolvedActionRules =
      dto.actionRules ??
      (dto.postHarvestActionTemplateIds !== undefined
        ? this.mapLegacyPostHarvestActionTemplateIdsToRules(
            dto.postHarvestActionTemplateIds,
          )
        : undefined);

    if (resolvedActionRules !== undefined) {
      await this.replaceActionRules(vegetable, resolvedActionRules);
    }

    await this.em.persistAndFlush(vegetable);

    await this.em.populate(vegetable, [
      'recommendedSoils',
      'commonPests',
      'commonDiseases',
      'goodCompanions',
      'badCompanions',
      'actionRules',
      'actionRules.actionTemplate',
    ]);

    return this.serializeVegetable(vegetable);
  }

  async update(id: string, dto: UpdateVegetableDto) {
    const vegetable = await this.em.findOne(
      Vegetable,
      { id },
      {
        populate: [
          'recommendedSoils',
          'commonPests',
          'commonDiseases',
          'goodCompanions',
          'badCompanions',
          'actionRules',
          'actionRules.actionTemplate',
        ],
      },
    );

    if (!vegetable) {
      throw new NotFoundException('Vegetable not found');
    }

    if (dto.name && dto.name !== vegetable.name) {
      const existing = await this.em.findOne(Vegetable, {
        id: { $ne: id },
        name: { $ilike: dto.name },
      });
      if (existing) {
        throw new ConflictException('Vegetable name already exists');
      }
      vegetable.name = dto.name;
      vegetable.slug = toSlug(dto.name);
    }

    if (dto.name !== undefined && dto.name === vegetable.name)
      vegetable.name = dto.name;
    if (dto.name !== undefined && dto.name === vegetable.name)
      vegetable.slug = toSlug(dto.name);
    if (dto.description !== undefined) vegetable.description = dto.description;
    if (dto.latinName !== undefined) vegetable.latinName = dto.latinName;
    if (dto.imageUrl !== undefined) vegetable.imageUrl = dto.imageUrl;
    if (dto.sunExposure !== undefined) vegetable.sunExposure = dto.sunExposure;
    if (dto.waterDemand !== undefined) vegetable.waterDemand = dto.waterDemand;
    if (dto.nutrientDemand !== undefined)
      vegetable.nutrientDemand = dto.nutrientDemand;
    if (dto.sowingMethods !== undefined)
      vegetable.sowingMethods = dto.sowingMethods;
    if (dto.timeToHarvestDaysMin !== undefined)
      vegetable.timeToHarvestDaysMin = dto.timeToHarvestDaysMin;
    if (dto.timeToHarvestDaysMax !== undefined)
      vegetable.timeToHarvestDaysMax = dto.timeToHarvestDaysMax;
    if (dto.successionSowing !== undefined)
      vegetable.successionSowing = dto.successionSowing;
    if (dto.successionIntervalDays !== undefined)
      vegetable.successionIntervalDays = dto.successionIntervalDays;
    if (dto.harvestStartMonth !== undefined)
      vegetable.harvestStartMonth = dto.harvestStartMonth;
    if (dto.harvestEndMonth !== undefined)
      vegetable.harvestEndMonth = dto.harvestEndMonth;
    if (dto.harvestSigns !== undefined)
      vegetable.harvestSigns = dto.harvestSigns;
    if (dto.fertilizationStages !== undefined)
      vegetable.fertilizationStages = dto.fertilizationStages;
    if (dto.family !== undefined) vegetable.family = dto.family;
    if (dto.botanicalFamily !== undefined)
      vegetable.botanicalFamily = dto.botanicalFamily;
    if (dto.nutrientNeeds !== undefined)
      vegetable.nutrientNeeds = dto.nutrientNeeds;
    if (dto.rotationGroup !== undefined)
      vegetable.rotationGroup = dto.rotationGroup;
    if (dto.minSoilDepthCm !== undefined)
      vegetable.minSoilDepthCm = dto.minSoilDepthCm;
    if (dto.dominantNutrientDemand !== undefined)
      vegetable.dominantNutrientDemand = dto.dominantNutrientDemand;
    if (dto.recommendedSoilIds !== undefined) {
      const soils = await this.loadSoilsByRefs(dto.recommendedSoilIds);
      vegetable.recommendedSoils.set(soils);
    }

    if (dto.commonPestIds !== undefined) {
      const pests = await this.loadPestsByRefs(dto.commonPestIds);
      vegetable.commonPests.set(pests);
    }

    if (dto.commonDiseaseIds !== undefined) {
      const diseases = await this.loadDiseasesByRefs(dto.commonDiseaseIds);
      vegetable.commonDiseases.set(diseases);
    }

    if (dto.goodCompanionIds !== undefined) {
      const companions = await this.loadVegetablesByRefs(dto.goodCompanionIds);
      vegetable.goodCompanions.set(companions);
    }

    if (dto.badCompanionIds !== undefined) {
      const companions = await this.loadVegetablesByRefs(dto.badCompanionIds);
      vegetable.badCompanions.set(companions);
    }

    const resolvedActionRules =
      dto.actionRules ??
      (dto.postHarvestActionTemplateIds !== undefined
        ? this.mapLegacyPostHarvestActionTemplateIdsToRules(
            dto.postHarvestActionTemplateIds,
          )
        : undefined);

    if (resolvedActionRules !== undefined) {
      await this.replaceActionRules(vegetable, resolvedActionRules);
      vegetable.rulesVersion += 1;
    }

    await this.em.flush();

    return this.serializeVegetable(vegetable);
  }

  async remove(id: string) {
    const vegetable = await this.em.findOne(Vegetable, { id });
    if (!vegetable) {
      throw new NotFoundException('Vegetable not found');
    }

    const plantingCount = await this.em.count(Planting, { vegetable: id });
    if (plantingCount > 0) {
      throw new ConflictException(
        'Cannot delete vegetable because it is referenced by existing plantings',
      );
    }

    await this.em.removeAndFlush(vegetable);
  }

  async removeMany(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const vegetables = await this.em.find(Vegetable, {
      id: { $in: uniqueIds },
    });

    if (vegetables.length !== uniqueIds.length) {
      throw new NotFoundException('One or more vegetables not found');
    }

    const plantingCount = await this.em.count(Planting, {
      vegetable: { $in: uniqueIds },
    });
    if (plantingCount > 0) {
      throw new ConflictException(
        'Cannot delete one or more vegetables because they are referenced by existing plantings',
      );
    }

    await this.em.removeAndFlush(vegetables);
  }

  private async loadSoilsByRefs(refs: string[]): Promise<Soil[]> {
    if (refs.length === 0) {
      return [];
    }

    const uniqueRefs = [...new Set(refs)];
    const items = await this.em.find(Soil, {
      $or: [{ slug: { $in: uniqueRefs } }, { id: { $in: uniqueRefs } }],
    });
    this.assertNoMissingRefs(uniqueRefs, items, 'Soil');

    return items;
  }

  private async loadPestsByRefs(refs: string[]): Promise<Pest[]> {
    if (refs.length === 0) {
      return [];
    }

    const uniqueRefs = [...new Set(refs)];
    const items = await this.em.find(Pest, {
      $or: [{ slug: { $in: uniqueRefs } }, { id: { $in: uniqueRefs } }],
    });
    this.assertNoMissingRefs(uniqueRefs, items, 'Pest');

    return items;
  }

  private async loadDiseasesByRefs(refs: string[]): Promise<Disease[]> {
    if (refs.length === 0) {
      return [];
    }

    const uniqueRefs = [...new Set(refs)];
    const items = await this.em.find(Disease, {
      $or: [{ slug: { $in: uniqueRefs } }, { id: { $in: uniqueRefs } }],
    });
    this.assertNoMissingRefs(uniqueRefs, items, 'Disease');

    return items;
  }

  private async loadVegetablesByRefs(refs: string[]): Promise<Vegetable[]> {
    if (refs.length === 0) {
      return [];
    }

    const uniqueRefs = [...new Set(refs)];
    const items = await this.em.find(Vegetable, {
      $or: [{ slug: { $in: uniqueRefs } }, { id: { $in: uniqueRefs } }],
    });
    this.assertNoMissingRefs(uniqueRefs, items, 'Vegetable');

    return items;
  }

  private async loadActionTemplatesByRefs(
    refs: string[],
  ): Promise<ActionTemplate[]> {
    if (refs.length === 0) {
      return [];
    }

    const uniqueRefs = [...new Set(refs)];
    const items = await this.em.find(ActionTemplate, {
      $or: [{ slug: { $in: uniqueRefs } }, { id: { $in: uniqueRefs } }],
    });
    this.assertNoMissingRefs(uniqueRefs, items, 'ActionTemplate');

    return items;
  }

  private assertNoMissingIds<T extends { id: string }>(
    expectedIds: string[],
    items: T[],
    label: string,
  ): void {
    if (expectedIds.length === 0) {
      return;
    }

    const foundIds = new Set(items.map((item) => item.id));
    const missing = expectedIds.filter((id) => !foundIds.has(id));

    if (missing.length) {
      throw new BadRequestException(
        `Missing ${label} IDs: ${missing.join(', ')}`,
      );
    }
  }

  private assertNoMissingRefs<T extends { id: string; slug: string }>(
    expectedRefs: string[],
    items: T[],
    label: string,
  ): void {
    if (expectedRefs.length === 0) {
      return;
    }

    const expected = new Set(expectedRefs);
    const matched = new Set<string>();

    for (const item of items) {
      if (expected.has(item.id)) matched.add(item.id);
      if (expected.has(item.slug)) matched.add(item.slug);
    }

    const missing = expectedRefs.filter((ref) => !matched.has(ref));

    if (missing.length) {
      throw new BadRequestException(
        `Missing ${label} references (slug/id): ${missing.join(', ')}`,
      );
    }
  }

  private serializeVegetable(entity: Vegetable) {
    const actionRules = entity.actionRules.getItems();

    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      latinName: entity.latinName ?? null,
      imageUrl: entity.imageUrl ?? null,
      description: entity.description,
      sunExposure: entity.sunExposure ?? null,
      waterDemand: entity.waterDemand ?? null,
      recommendedSoilIds: entity.recommendedSoils
        .getItems()
        .map((soil) => soil.slug),
      nutrientDemand: entity.nutrientDemand ?? null,
      family: entity.family,
      botanicalFamily: entity.botanicalFamily ?? null,
      nutrientNeeds: entity.nutrientNeeds,
      rotationGroup: entity.rotationGroup,
      minSoilDepthCm: entity.minSoilDepthCm ?? null,
      dominantNutrientDemand: entity.dominantNutrientDemand ?? null,
      sowingMethods: entity.sowingMethods ?? null,
      timeToHarvestDaysMin: entity.timeToHarvestDaysMin ?? null,
      timeToHarvestDaysMax: entity.timeToHarvestDaysMax ?? null,
      successionSowing: entity.successionSowing,
      successionIntervalDays: entity.successionIntervalDays ?? null,
      harvestStartMonth: entity.harvestStartMonth ?? null,
      harvestEndMonth: entity.harvestEndMonth ?? null,
      harvestSigns: entity.harvestSigns ?? null,
      fertilizationStages: entity.fertilizationStages ?? null,
      commonPests: entity.commonPests
        .getItems()
        .map((item) => ({ id: item.id, slug: item.slug, name: item.name })),
      commonDiseases: entity.commonDiseases
        .getItems()
        .map((item) => ({ id: item.id, slug: item.slug, name: item.name })),
      goodCompanions: entity.goodCompanions
        .getItems()
        .map((item) => ({ id: item.id, slug: item.slug, name: item.name })),
      badCompanions: entity.badCompanions
        .getItems()
        .map((item) => ({ id: item.id, slug: item.slug, name: item.name })),
      postHarvestActionTemplateIds: Array.from(
        new Set(
          actionRules
            .filter(
              (rule) =>
                rule.trigger === 'ON_HARVEST_CONFIRMED' && rule.isEnabled,
            )
            .map((rule) => rule.actionTemplate.slug),
        ),
      ),
      rulesVersion: entity.rulesVersion,
      actionRules: actionRules.map((rule) => {
        return {
          id: rule.id,
          trigger: rule.trigger,
          offsetDays: rule.offsetDays,
          schedule: rule.schedule,
          everyNDays: rule.everyNDays ?? null,
          occurrencesLimit: rule.occurrencesLimit ?? null,
          applyIfStartMethod:
            rule.applyIfStartMethod?.map((method) =>
              this.toPlantingStartMethodEnum(method),
            ) ?? null,
          isEnabled: rule.isEnabled,
          actionTemplate: {
            id: rule.actionTemplate.id,
            slug: rule.actionTemplate.slug,
            name: rule.actionTemplate.name,
            scope: rule.actionTemplate.target,
            target: rule.actionTemplate.target,
            type: rule.actionTemplate.type,
            description: rule.actionTemplate.description ?? null,
            defaultDueOffsetDays: rule.actionTemplate.defaultDueOffsetDays,
          },
        };
      }),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private mapLegacyPostHarvestActionTemplateIdsToRules(
    actionTemplateIds: string[],
  ): VegetableActionRuleInput[] {
    return Array.from(new Set(actionTemplateIds)).map((actionTemplateId) => ({
      actionTemplateId,
      trigger: ActionRuleTrigger.ON_HARVEST_CONFIRMED,
      offsetDays: 0,
      schedule: ActionRuleSchedule.ONCE,
      isEnabled: true,
    }));
  }

  private async replaceActionRules(
    vegetable: Vegetable,
    rules: VegetableActionRuleInput[],
  ) {
    const actionRulesCollection: Collection<VegetableActionRule> =
      vegetable.actionRules;

    await this.em.nativeDelete(VegetableActionRule, {
      vegetable: vegetable.id,
    });

    if (rules.length === 0) {
      actionRulesCollection.removeAll();
      return;
    }

    const templateIds = Array.from(
      new Set(
        rules.map((item: VegetableActionRuleInput) => item.actionTemplateId),
      ),
    );

    const templates = await this.loadActionTemplatesByRefs(templateIds);
    const templateByRef = new Map(
      templates.flatMap((item) => [
        [item.id, item] as const,
        [item.slug, item] as const,
      ]),
    );

    const items: VegetableActionRule[] = rules.map(
      (item: VegetableActionRuleInput) => {
        const actionTemplate = templateByRef.get(item.actionTemplateId);
        if (!actionTemplate) {
          throw new BadRequestException(
            `Missing ActionTemplate reference (slug/id): ${item.actionTemplateId}`,
          );
        }

        const rule = new VegetableActionRule();
        rule.vegetable = vegetable;
        rule.actionTemplate = actionTemplate;
        rule.trigger = this.toRuleTriggerValue(item.trigger);
        rule.offsetDays = item.offsetDays;
        rule.schedule = this.toRuleScheduleValue(item.schedule);
        rule.everyNDays = item.everyNDays ?? null;
        rule.occurrencesLimit = item.occurrencesLimit ?? null;
        rule.applyIfStartMethod =
          item.applyIfStartMethod?.map((method) =>
            this.toPlantingStartMethodValue(method),
          ) ?? null;
        rule.isEnabled = item.isEnabled ?? true;

        return rule;
      },
    );

    this.em.persist(items);
    actionRulesCollection.set(items);
  }

  private toRuleTriggerValue(
    trigger: ActionRuleTrigger,
  ): VegetableActionRule['trigger'] {
    switch (trigger) {
      case ActionRuleTrigger.ON_SOWED:
        return 'ON_SOWED';
      case ActionRuleTrigger.AFTER_SOWING_DAYS:
        return 'AFTER_SOWING_DAYS';
      case ActionRuleTrigger.ON_TRANSPLANTED:
        return 'ON_TRANSPLANTED';
      case ActionRuleTrigger.AFTER_TRANSPLANT_DAYS:
        return 'AFTER_TRANSPLANT_DAYS';
      case ActionRuleTrigger.BEFORE_TRANSPLANT_DAYS:
        return 'BEFORE_TRANSPLANT_DAYS';
      case ActionRuleTrigger.ON_HARVEST_WINDOW_START:
        return 'ON_HARVEST_WINDOW_START';
      case ActionRuleTrigger.BEFORE_HARVEST_WINDOW_START_DAYS:
        return 'BEFORE_HARVEST_WINDOW_START_DAYS';
      case ActionRuleTrigger.ON_HARVEST_CONFIRMED:
        return 'ON_HARVEST_CONFIRMED';
      case ActionRuleTrigger.AFTER_HARVEST_DAYS:
        return 'AFTER_HARVEST_DAYS';
    }
  }

  private toRuleScheduleValue(
    schedule: ActionRuleSchedule,
  ): VegetableActionRule['schedule'] {
    switch (schedule) {
      case ActionRuleSchedule.ONCE:
        return 'ONCE';
      case ActionRuleSchedule.EVERY_N_DAYS:
        return 'EVERY_N_DAYS';
    }
  }

  private toPlantingStartMethodValue(
    method: PlantingStartMethod,
  ): NonNullable<VegetableActionRule['applyIfStartMethod']>[number] {
    switch (method) {
      case PlantingStartMethod.DIRECT_SOW:
        return 'DIRECT_SOW';
      case PlantingStartMethod.TRANSPLANT:
        return 'TRANSPLANT';
    }
  }

  private toPlantingStartMethodEnum(
    method: NonNullable<VegetableActionRule['applyIfStartMethod']>[number],
  ): PlantingStartMethod {
    switch (method) {
      case 'DIRECT_SOW':
        return PlantingStartMethod.DIRECT_SOW;
      case 'TRANSPLANT':
        return PlantingStartMethod.TRANSPLANT;
    }
  }
}
