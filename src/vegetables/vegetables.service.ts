import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityName, FilterQuery } from '@mikro-orm/core';
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
import {
  CreateVegetableDto,
  ListVegetablesQueryDto,
  VegetableActionRuleDto,
  UpdateVegetableDto,
} from './dto/vegetable.schemas';
import { VegetableActionRule } from './vegetable-action-rule.entity';

@Injectable()
export class VegetablesService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListVegetablesQueryDto) {
    const { page, limit, q, sunExposure, waterDemand, nutrientDemand } = query;
    const search = q?.trim();

    const where: Record<string, unknown> = {};

    if (sunExposure) where.sunExposure = sunExposure;
    if (waterDemand) where.waterDemand = waterDemand;
    if (nutrientDemand) where.nutrientDemand = nutrientDemand;

    if (search) {
      where.$or = [
        { name: { $ilike: `%${search}%` } },
        { latinName: { $ilike: `%${search}%` } },
        { slug: { $ilike: `%${search}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(Vegetable, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
      populate: ['recommendedSoils'],
      fields: [
        'id',
        'slug',
        'name',
        'latinName',
        'imageUrl',
        'recommendedSoils',
        'family',
        'nutrientNeeds',
        'rotationGroup',
        'minSoilDepthCm',
        'dominantNutrientDemand',
      ],
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        latinName: item.latinName ?? null,
        imageUrl: item.imageUrl ?? null,
        recommendedSoilIds: item.recommendedSoils
          .getItems()
          .map((soil) => soil.id),
        family: item.family,
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
    const vegetable = new Vegetable();
    vegetable.slug = dto.slug;
    vegetable.name = dto.name;
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
    vegetable.nutrientNeeds = dto.nutrientNeeds ?? NutrientNeeds.MEDIUM;
    vegetable.rotationGroup = dto.rotationGroup ?? RotationGroup.OTHER;
    vegetable.minSoilDepthCm = dto.minSoilDepthCm ?? null;
    vegetable.dominantNutrientDemand = dto.dominantNutrientDemand ?? null;

    if (dto.recommendedSoilIds !== undefined) {
      const soils = await this.loadEntitiesByIds(
        Soil,
        dto.recommendedSoilIds,
        'Soil',
      );
      vegetable.recommendedSoils.set(soils);
    }

    if (dto.commonPestIds) {
      const pests = await this.loadEntitiesByIds(
        Pest,
        dto.commonPestIds,
        'Pest',
      );
      vegetable.commonPests.set(pests);
    }

    if (dto.commonDiseaseIds) {
      const diseases = await this.loadEntitiesByIds(
        Disease,
        dto.commonDiseaseIds,
        'Disease',
      );
      vegetable.commonDiseases.set(diseases);
    }

    if (dto.goodCompanionIds) {
      const companions = await this.loadEntitiesByIds(
        Vegetable,
        dto.goodCompanionIds,
        'Vegetable',
      );
      vegetable.goodCompanions.set(companions);
    }

    if (dto.badCompanionIds) {
      const companions = await this.loadEntitiesByIds(
        Vegetable,
        dto.badCompanionIds,
        'Vegetable',
      );
      vegetable.badCompanions.set(companions);
    }

    if (dto.actionRules !== undefined) {
      await this.replaceActionRules(vegetable, dto.actionRules);
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

    if (dto.slug && dto.slug !== vegetable.slug) {
      const existing = await this.em.findOne(Vegetable, { slug: dto.slug });
      if (existing) {
        throw new ConflictException('Vegetable slug already exists');
      }
      vegetable.slug = dto.slug;
    }

    if (dto.name !== undefined) vegetable.name = dto.name;
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
    if (dto.nutrientNeeds !== undefined)
      vegetable.nutrientNeeds = dto.nutrientNeeds;
    if (dto.rotationGroup !== undefined)
      vegetable.rotationGroup = dto.rotationGroup;
    if (dto.minSoilDepthCm !== undefined)
      vegetable.minSoilDepthCm = dto.minSoilDepthCm;
    if (dto.dominantNutrientDemand !== undefined)
      vegetable.dominantNutrientDemand = dto.dominantNutrientDemand;
    if (dto.recommendedSoilIds !== undefined) {
      const soils = await this.loadEntitiesByIds(
        Soil,
        dto.recommendedSoilIds,
        'Soil',
      );
      vegetable.recommendedSoils.set(soils);
    }

    if (dto.commonPestIds !== undefined) {
      const pests = await this.loadEntitiesByIds(
        Pest,
        dto.commonPestIds,
        'Pest',
      );
      vegetable.commonPests.set(pests);
    }

    if (dto.commonDiseaseIds !== undefined) {
      const diseases = await this.loadEntitiesByIds(
        Disease,
        dto.commonDiseaseIds,
        'Disease',
      );
      vegetable.commonDiseases.set(diseases);
    }

    if (dto.goodCompanionIds !== undefined) {
      const companions = await this.loadEntitiesByIds(
        Vegetable,
        dto.goodCompanionIds,
        'Vegetable',
      );
      vegetable.goodCompanions.set(companions);
    }

    if (dto.badCompanionIds !== undefined) {
      const companions = await this.loadEntitiesByIds(
        Vegetable,
        dto.badCompanionIds,
        'Vegetable',
      );
      vegetable.badCompanions.set(companions);
    }

    if (dto.actionRules !== undefined) {
      await this.replaceActionRules(vegetable, dto.actionRules);
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

    await this.em.removeAndFlush(vegetable);
  }

  private async loadEntitiesByIds<T extends { id: string }>(
    entity: EntityName<T>,
    ids: string[],
    label: string,
  ): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const query = { id: { $in: ids } } as unknown as FilterQuery<T>;
    const items = await this.em.find(entity, query);
    const foundIds = new Set(items.map((item) => item.id));
    const missing = ids.filter((id) => !foundIds.has(id));

    if (missing.length) {
      throw new BadRequestException(
        `Missing ${label} IDs: ${missing.join(', ')}`,
      );
    }

    return items;
  }

  private serializeVegetable(entity: Vegetable) {
    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      latinName: entity.latinName ?? null,
      imageUrl: entity.imageUrl ?? null,
      description: entity.description,
      sunExposure: entity.sunExposure ?? null,
      waterDemand: entity.waterDemand ?? null,
      recommendedSoilIds: entity.recommendedSoils
        .getItems()
        .map((soil) => soil.id),
      nutrientDemand: entity.nutrientDemand ?? null,
      family: entity.family,
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
      rulesVersion: entity.rulesVersion,
      actionRules: entity.actionRules.getItems().map((rule) => ({
        id: rule.id,
        trigger: rule.trigger,
        offsetDays: rule.offsetDays,
        schedule: rule.schedule,
        everyNDays: rule.everyNDays ?? null,
        occurrencesLimit: rule.occurrencesLimit ?? null,
        applyIfStartMethod: rule.applyIfStartMethod ?? null,
        isEnabled: rule.isEnabled,
        actionTemplate: {
          id: rule.actionTemplate.id,
          name: rule.actionTemplate.name,
          scope: rule.actionTemplate.target,
          target: rule.actionTemplate.target,
          type: rule.actionTemplate.type,
          description: rule.actionTemplate.description ?? null,
          defaultDueOffsetDays: rule.actionTemplate.defaultDueOffsetDays,
        },
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private async replaceActionRules(
    vegetable: Vegetable,
    rules: VegetableActionRuleDto[],
  ) {
    await this.em.nativeDelete(VegetableActionRule, {
      vegetable: vegetable.id,
    });

    if (rules.length === 0) {
      vegetable.actionRules.removeAll();
      return;
    }

    const templateIds = Array.from(
      new Set(rules.map((item) => item.actionTemplateId)),
    );

    const templates = await this.loadEntitiesByIds(
      ActionTemplate,
      templateIds,
      'ActionTemplate',
    );
    const templateById = new Map(templates.map((item) => [item.id, item]));

    const items: VegetableActionRule[] = rules.map((item) => {
      const actionTemplate = templateById.get(item.actionTemplateId);
      if (!actionTemplate) {
        throw new BadRequestException(
          `Missing ActionTemplate ID: ${item.actionTemplateId}`,
        );
      }

      const rule = new VegetableActionRule();
      rule.vegetable = vegetable;
      rule.actionTemplate = actionTemplate;
      rule.trigger = item.trigger;
      rule.offsetDays = item.offsetDays;
      rule.schedule = item.schedule;
      rule.everyNDays = item.everyNDays ?? null;
      rule.occurrencesLimit = item.occurrencesLimit ?? null;
      rule.applyIfStartMethod = item.applyIfStartMethod ?? null;
      rule.isEnabled = item.isEnabled ?? true;

      return rule;
    });

    this.em.persist(items);
    vegetable.actionRules.set(items);
  }
}
