import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';
import { User } from '../users/user.entity';
import {
  CreateManualPlanChecklistItemDto,
  PatchPlanChecklistItemDto,
} from './dto/plan-checklist.schemas';
import { PlanChecklistTemplate } from './plan-checklist-template.entity';
import { PlanChecklistItem } from './plan-checklist-item.entity';
import {
  PlanChecklistPriority,
  PlanChecklistScope,
  PlanChecklistSource,
  PlanChecklistStatus,
} from '../common/enums/plan-checklist.enums';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import {
  DemandLevel,
  DominantNutrientDemand,
  SowingMethodType,
} from '../common/enums/vegetable.enums';
import { DemandLevel as SoilDemandLevel } from '../common/enums/soil.enums';
import { FertilizerType } from '../fertilizers/fertilizer-type.entity';
import { NutrientEffect } from '../common/enums/fertilizer.enums';
import { Vegetable } from '../vegetables/vegetable.entity';
import { Soil } from '../soils/soil.entity';

type CandidateItem = {
  sourceKey: string;
  dedupeKey: string;
  scope: PlanChecklistScope;
  priority: PlanChecklistPriority;
  title: string;
  description?: string | null;
  reason?: string | null;
  bed: Bed;
  planting?: Planting | null;
  vegetableId?: string | null;
  soilId?: string | null;
  fertilizerId?: string | null;
  template: PlanChecklistTemplate;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class PlanChecklistsService {
  constructor(private readonly em: EntityManager) {}

  async getBedPlan(user: User, bedId: string, includeArchived = false) {
    const bed = await this.em.findOne(
      Bed,
      { id: bedId, user: user.id },
      { populate: ['soil'] },
    );

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    const plannedPlantings = await this.em.find(
      Planting,
      {
        user: user.id,
        bed: bed.id,
        status: PlantingStatus.NEW,
      },
      {
        populate: ['vegetable'],
        orderBy: { plannedStartDate: 'asc' },
      },
    );

    const activeWhere: Record<string, unknown> = {
      user: user.id,
      bed: bed.id,
      suppressedAt: null,
      archivedAt: null,
    };

    const checklistItems = await this.em.find(PlanChecklistItem, activeWhere, {
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    const archivedChecklistItems = includeArchived
      ? await this.em.find(
          PlanChecklistItem,
          {
            user: user.id,
            bed: bed.id,
            archivedAt: { $ne: null },
          },
          { orderBy: [{ archivedAt: 'desc' }, { updatedAt: 'desc' }] },
        )
      : [];

    const summary = {
      total: checklistItems.length,
      pending: checklistItems.filter(
        (item) => item.status === PlanChecklistStatus.PENDING,
      ).length,
      done: checklistItems.filter(
        (item) => item.status === PlanChecklistStatus.DONE,
      ).length,
      skipped: checklistItems.filter(
        (item) => item.status === PlanChecklistStatus.SKIPPED,
      ).length,
    };

    return {
      bed: {
        id: bed.id,
        name: bed.name,
        depthCm: bed.depthCm ?? null,
        soil: bed.soil
          ? {
              id: bed.soil.id,
              name: bed.soil.name,
              slug: bed.soil.slug,
            }
          : null,
      },
      plannedPlantings: plannedPlantings.map((planting) => ({
        id: planting.id,
        vegetableId: planting.vegetable.id,
        vegetableName: planting.vegetable.name,
        vegetableSlug: planting.vegetable.slug,
        plannedStartDate: planting.plannedStartDate,
        startMethod: planting.startMethod,
        status: planting.status,
      })),
      checklistItems: checklistItems.map((item) =>
        this.serializeChecklistItem(item),
      ),
      ...(includeArchived
        ? {
            archivedChecklistItems: archivedChecklistItems.map((item) =>
              this.serializeChecklistItem(item),
            ),
          }
        : {}),
      summary,
    };
  }

  async recomputeForBed(params: { user: User; bedId: string; reason: string }) {
    const bed = await this.em.findOne(
      Bed,
      { id: params.bedId, user: params.user.id },
      { populate: ['soil'] },
    );

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    const plannedPlantings = await this.em.find(
      Planting,
      {
        user: params.user.id,
        bed: bed.id,
        status: PlantingStatus.NEW,
      },
      {
        populate: [
          'vegetable',
          'vegetable.recommendedSoils',
          'vegetable.badCompanions',
        ],
      },
    );

    const allExisting = await this.em.find(PlanChecklistItem, {
      user: params.user.id,
      bed: bed.id,
      archivedAt: null,
    });

    if (plannedPlantings.length === 0) {
      this.archivePlanForBedWithoutPlannedPlantings({
        items: allExisting,
        reason: 'plan_completed_or_empty',
      });

      await this.em.flush();

      return this.getBedPlan(params.user, bed.id, false);
    }

    const templates = await this.em.find(
      PlanChecklistTemplate,
      { isActive: true },
      { orderBy: [{ scope: 'asc' }, { slug: 'asc' }] },
    );

    const fertilizers = await this.em.find(FertilizerType, { isActive: true });
    const candidates = this.buildCandidates({
      bed,
      plantings: plannedPlantings,
      templates,
      fertilizers,
    });

    const existingByKey = new Map<string, PlanChecklistItem>();
    const suppressedKeys = new Set<string>();

    for (const item of allExisting) {
      const key = item.sourceKey ?? item.dedupeKey;
      if (!key) continue;

      if (item.suppressedAt) {
        suppressedKeys.add(key);
      }

      if (!existingByKey.has(key)) {
        existingByKey.set(key, item);
      }
    }

    const desiredKeys = new Set<string>();

    for (const candidate of candidates) {
      desiredKeys.add(candidate.sourceKey);

      if (suppressedKeys.has(candidate.sourceKey)) {
        continue;
      }

      const existing = existingByKey.get(candidate.sourceKey);
      if (existing) {
        if (existing.source !== PlanChecklistSource.AUTO) {
          continue;
        }

        existing.scope = candidate.scope;
        existing.priority = candidate.priority;
        existing.title = candidate.title;
        existing.description = candidate.description ?? null;
        existing.reason = candidate.reason ?? null;
        existing.template = candidate.template;
        existing.bed = candidate.bed;
        existing.planting = candidate.planting ?? null;
        existing.vegetable = candidate.vegetableId
          ? this.em.getReference(Vegetable, candidate.vegetableId)
          : null;
        existing.soil = candidate.soilId
          ? this.em.getReference(Soil, candidate.soilId)
          : null;
        existing.fertilizer = candidate.fertilizerId
          ? this.em.getReference(FertilizerType, candidate.fertilizerId)
          : null;
        existing.metadata = candidate.metadata ?? null;
        existing.sourceKey = candidate.sourceKey;
        existing.dedupeKey = candidate.dedupeKey;
        existing.archivedAt = null;
        existing.archiveReason = null;
        continue;
      }

      const created = new PlanChecklistItem();
      created.user = params.user;
      created.bed = candidate.bed;
      created.planting = candidate.planting ?? null;
      created.vegetable = candidate.vegetableId
        ? this.em.getReference(Vegetable, candidate.vegetableId)
        : null;
      created.soil = candidate.soilId
        ? this.em.getReference(Soil, candidate.soilId)
        : null;
      created.fertilizer = candidate.fertilizerId
        ? this.em.getReference(FertilizerType, candidate.fertilizerId)
        : null;
      created.template = candidate.template;
      created.scope = candidate.scope;
      created.status = PlanChecklistStatus.PENDING;
      created.source = PlanChecklistSource.AUTO;
      created.sourceKey = candidate.sourceKey;
      created.dedupeKey = candidate.dedupeKey;
      created.priority = candidate.priority;
      created.title = candidate.title;
      created.description = candidate.description ?? null;
      created.reason = candidate.reason ?? null;
      created.metadata = candidate.metadata ?? null;
      created.isUserModified = false;
      created.suppressedAt = null;
      created.archivedAt = null;
      created.archiveReason = null;
      created.doneAt = null;
      created.skippedAt = null;

      this.em.persist(created);
    }

    for (const item of allExisting) {
      if (item.source !== PlanChecklistSource.AUTO) {
        continue;
      }

      const key = item.sourceKey ?? item.dedupeKey;
      if (!key) {
        continue;
      }

      if (item.suppressedAt) {
        continue;
      }

      if (!desiredKeys.has(key)) {
        item.archivedAt = new Date();
        item.archiveReason = 'recompute_not_applicable';
      }
    }

    await this.em.flush();

    return this.getBedPlan(params.user, bed.id, false);
  }

  async createManualItem(
    user: User,
    bedId: string,
    dto: CreateManualPlanChecklistItemDto,
  ) {
    const bed = await this.em.findOne(Bed, { id: bedId, user: user.id });

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    let planting: Planting | null = null;

    if (dto.plantingId) {
      planting = await this.em.findOne(Planting, {
        id: dto.plantingId,
        user: user.id,
        bed: bed.id,
      });

      if (!planting) {
        throw new BadRequestException('Planting not found for this bed');
      }
    }

    const item = new PlanChecklistItem();
    item.user = user;
    item.bed = bed;
    item.planting = planting;
    item.scope = planting
      ? PlanChecklistScope.PLANTING
      : PlanChecklistScope.BED;
    item.status = PlanChecklistStatus.PENDING;
    item.source = PlanChecklistSource.MANUAL;
    item.priority = dto.priority ?? PlanChecklistPriority.MEDIUM;
    item.title = dto.title.trim();
    item.description = dto.description ?? null;
    item.reason = null;
    item.sourceKey = null;
    item.dedupeKey = null;
    item.metadata = null;
    item.template = null;
    item.archivedAt = null;
    item.archiveReason = null;
    item.suppressedAt = null;
    item.doneAt = null;
    item.skippedAt = null;

    this.em.persist(item);
    await this.em.flush();

    return this.serializeChecklistItem(item);
  }

  async patchItem(user: User, itemId: string, dto: PatchPlanChecklistItemDto) {
    const item = await this.em.findOne(
      PlanChecklistItem,
      { id: itemId, user: user.id },
      { populate: ['user'] },
    );

    if (!item) {
      throw new NotFoundException('Plan checklist item not found');
    }

    if (
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.priority !== undefined
    ) {
      if (item.source !== PlanChecklistSource.MANUAL) {
        throw new ForbiddenException(
          'Only manual checklist items can edit title/description/priority',
        );
      }

      if (dto.title !== undefined) {
        item.title = dto.title.trim();
      }

      if (dto.description !== undefined) {
        item.description = dto.description;
      }

      if (dto.priority !== undefined) {
        item.priority = dto.priority;
      }

      item.isUserModified = true;
    }

    if (dto.status !== undefined) {
      item.status = dto.status;

      if (dto.status === PlanChecklistStatus.DONE) {
        item.doneAt = new Date();
        item.skippedAt = null;
      } else if (dto.status === PlanChecklistStatus.SKIPPED) {
        item.skippedAt = new Date();
        item.doneAt = null;
      } else {
        item.doneAt = null;
        item.skippedAt = null;
      }
    }

    await this.em.flush();

    return this.serializeChecklistItem(item);
  }

  async suppressItem(user: User, itemId: string) {
    const item = await this.em.findOne(PlanChecklistItem, {
      id: itemId,
      user: user.id,
    });

    if (!item) {
      throw new NotFoundException('Plan checklist item not found');
    }

    item.suppressedAt = new Date();
    item.isUserModified = true;

    await this.em.flush();
  }

  async archiveItemsForStartedPlanting(params: {
    user: User;
    plantingId: string;
    reason: string;
  }) {
    const items = await this.em.find(PlanChecklistItem, {
      user: params.user.id,
      planting: params.plantingId,
      archivedAt: null,
      suppressedAt: null,
    });

    for (const item of items) {
      item.archivedAt = new Date();
      item.archiveReason = params.reason;
    }

    await this.em.flush();
  }

  private archivePlanForBedWithoutPlannedPlantings(params: {
    items: PlanChecklistItem[];
    reason: string;
  }) {
    for (const item of params.items) {
      if (item.suppressedAt) {
        continue;
      }

      item.archivedAt = new Date();
      item.archiveReason = params.reason;
    }
  }

  private buildCandidates(params: {
    bed: Bed;
    plantings: Planting[];
    templates: PlanChecklistTemplate[];
    fertilizers: FertilizerType[];
  }): CandidateItem[] {
    const candidates: CandidateItem[] = [];

    for (const template of params.templates) {
      const kind = this.getTemplateConditionKind(template);
      if (!kind) {
        continue;
      }

      if (template.scope === PlanChecklistScope.BED) {
        const bedCandidate = this.buildBedScopeCandidate({
          bed: params.bed,
          plantings: params.plantings,
          template,
          conditionKind: kind,
        });

        if (bedCandidate) {
          candidates.push(bedCandidate);
        }
        continue;
      }

      for (const planting of params.plantings) {
        const plantingCandidates = this.buildPlantingScopeCandidates({
          bed: params.bed,
          planting,
          allPlantings: params.plantings,
          template,
          conditionKind: kind,
          fertilizers: params.fertilizers,
        });

        candidates.push(...plantingCandidates);
      }
    }

    const deduped = new Map<string, CandidateItem>();
    for (const candidate of candidates) {
      if (!deduped.has(candidate.sourceKey)) {
        deduped.set(candidate.sourceKey, candidate);
      }
    }

    return Array.from(deduped.values());
  }

  private buildBedScopeCandidate(params: {
    bed: Bed;
    plantings: Planting[];
    template: PlanChecklistTemplate;
    conditionKind: string;
  }): CandidateItem | null {
    const { bed, plantings, template, conditionKind } = params;

    if (conditionKind === 'bed_has_new_plantings') {
      if (plantings.length === 0) {
        return null;
      }

      return this.toCandidate({
        template,
        bed,
        scope: PlanChecklistScope.BED,
        sourceKey: `plan-checklist:bed:${bed.id}:${template.slug}`,
        dedupeKey: `plan-checklist:bed:${bed.id}:${template.slug}`,
        values: {
          bedName: bed.name,
        },
      });
    }

    if (conditionKind === 'improve_soil_with_compost') {
      const hasHighNutrientDemand = plantings.some(
        (item) => item.vegetable.nutrientDemand === DemandLevel.HIGH,
      );
      const soilLowFertility = bed.soil?.fertilityLevel === SoilDemandLevel.LOW;

      if (!hasHighNutrientDemand && !soilLowFertility) {
        return null;
      }

      return this.toCandidate({
        template,
        bed,
        scope: PlanChecklistScope.BED,
        sourceKey: `plan-checklist:bed:${bed.id}:${template.slug}`,
        dedupeKey: `plan-checklist:bed:${bed.id}:${template.slug}`,
        values: {
          bedName: bed.name,
        },
      });
    }

    if (conditionKind === 'improve_water_retention') {
      const soilLowRetention = bed.soil?.waterRetention === SoilDemandLevel.LOW;
      const hasHighWaterDemand = plantings.some(
        (item) => item.vegetable.waterDemand === DemandLevel.HIGH,
      );

      if (!soilLowRetention || !hasHighWaterDemand) {
        return null;
      }

      return this.toCandidate({
        template,
        bed,
        scope: PlanChecklistScope.BED,
        sourceKey: `plan-checklist:bed:${bed.id}:${template.slug}`,
        dedupeKey: `plan-checklist:bed:${bed.id}:${template.slug}`,
        values: {
          bedName: bed.name,
        },
      });
    }

    if (conditionKind === 'plan_fertilization_before_start') {
      const hasHighDemand = plantings.some(
        (item) => item.vegetable.nutrientDemand === DemandLevel.HIGH,
      );

      if (!hasHighDemand) {
        return null;
      }

      return this.toCandidate({
        template,
        bed,
        scope: PlanChecklistScope.BED,
        sourceKey: `plan-checklist:bed:${bed.id}:${template.slug}`,
        dedupeKey: `plan-checklist:bed:${bed.id}:${template.slug}`,
        values: {
          bedName: bed.name,
        },
      });
    }

    return null;
  }

  private buildPlantingScopeCandidates(params: {
    bed: Bed;
    planting: Planting;
    allPlantings: Planting[];
    template: PlanChecklistTemplate;
    conditionKind: string;
    fertilizers: FertilizerType[];
  }): CandidateItem[] {
    const {
      bed,
      planting,
      allPlantings,
      template,
      conditionKind,
      fertilizers,
    } = params;

    const vegetable = planting.vegetable;
    const valuesBase = {
      vegetableName: vegetable.name,
      bedName: bed.name,
    };

    if (conditionKind === 'seed_purchase_direct_sow') {
      const supportsDirectSowByMethod =
        planting.startMethod === PlantingStartMethod.DIRECT_SOW ||
        (vegetable.sowingMethods ?? []).some(
          (method) => method.method === SowingMethodType.DIRECT_SOW,
        );

      if (!supportsDirectSowByMethod) {
        return [];
      }

      return [
        this.toCandidate({
          template,
          bed,
          planting,
          scope: PlanChecklistScope.PLANTING,
          sourceKey: `plan-checklist:planting:${planting.id}:${template.slug}`,
          dedupeKey: `plan-checklist:planting:${planting.id}:${template.slug}`,
          values: valuesBase,
          vegetableId: vegetable.id,
        }),
      ];
    }

    if (conditionKind === 'seedling_preparation_transplant') {
      if (planting.startMethod !== PlantingStartMethod.TRANSPLANT) {
        return [];
      }

      return [
        this.toCandidate({
          template,
          bed,
          planting,
          scope: PlanChecklistScope.PLANTING,
          sourceKey: `plan-checklist:planting:${planting.id}:${template.slug}`,
          dedupeKey: `plan-checklist:planting:${planting.id}:${template.slug}`,
          values: valuesBase,
          vegetableId: vegetable.id,
        }),
      ];
    }

    if (conditionKind === 'seedling_containers_transplant') {
      if (planting.startMethod !== PlantingStartMethod.TRANSPLANT) {
        return [];
      }

      return [
        this.toCandidate({
          template,
          bed,
          planting,
          scope: PlanChecklistScope.PLANTING,
          sourceKey: `plan-checklist:planting:${planting.id}:${template.slug}`,
          dedupeKey: `plan-checklist:planting:${planting.id}:${template.slug}`,
          values: valuesBase,
          vegetableId: vegetable.id,
        }),
      ];
    }

    if (conditionKind === 'bed_depth_too_small') {
      if (
        bed.depthCm == null ||
        vegetable.minSoilDepthCm == null ||
        bed.depthCm >= vegetable.minSoilDepthCm
      ) {
        return [];
      }

      return [
        this.toCandidate({
          template,
          bed,
          planting,
          scope: PlanChecklistScope.PLANTING,
          sourceKey: `plan-checklist:planting:${planting.id}:${template.slug}`,
          dedupeKey: `plan-checklist:planting:${planting.id}:${template.slug}`,
          values: {
            ...valuesBase,
            bedDepthCm: bed.depthCm,
            minSoilDepthCm: vegetable.minSoilDepthCm,
          },
          vegetableId: vegetable.id,
        }),
      ];
    }

    if (conditionKind === 'soil_not_recommended') {
      if (!bed.soil) {
        return [];
      }

      const recommended = vegetable.recommendedSoils
        .getItems()
        .some((soil) => soil.id === bed.soil?.id);

      if (recommended) {
        return [];
      }

      return [
        this.toCandidate({
          template,
          bed,
          planting,
          scope: PlanChecklistScope.PLANTING,
          sourceKey: `plan-checklist:planting:${planting.id}:${template.slug}:${bed.soil.slug}`,
          dedupeKey: `plan-checklist:planting:${planting.id}:${template.slug}:${bed.soil.slug}`,
          values: {
            ...valuesBase,
            soilName: bed.soil.name,
            soilSlug: bed.soil.slug,
          },
          vegetableId: vegetable.id,
          soilId: bed.soil.id,
        }),
      ];
    }

    if (conditionKind === 'check_npk_fertilizer') {
      const demand = vegetable.dominantNutrientDemand;
      if (!demand || demand === DominantNutrientDemand.BALANCED) {
        return [];
      }

      const nutrientLabel =
        demand === DominantNutrientDemand.N
          ? 'azot'
          : demand === DominantNutrientDemand.P
            ? 'fosfor'
            : 'potas';

      const fertilizer = this.pickFertilizerForDemand(demand, fertilizers);
      const fertilizerSuffix = fertilizer ? `:${fertilizer.slug}` : ':none';

      return [
        this.toCandidate({
          template,
          bed,
          planting,
          scope: PlanChecklistScope.PLANTING,
          sourceKey: `plan-checklist:planting:${planting.id}:${template.slug}${fertilizerSuffix}`,
          dedupeKey: `plan-checklist:planting:${planting.id}:${template.slug}${fertilizerSuffix}`,
          values: {
            ...valuesBase,
            nutrientLabel,
            fertilizerName: fertilizer?.name ?? 'nawóz',
          },
          vegetableId: vegetable.id,
          fertilizerId: fertilizer?.id ?? null,
          metadata: {
            dominantNutrientDemand: demand,
            recommendedFertilizerSlug: fertilizer?.slug ?? null,
          },
        }),
      ];
    }

    if (conditionKind === 'bad_companion_conflict') {
      const badCompanionIds = new Set(
        vegetable.badCompanions.getItems().map((item) => item.id),
      );

      if (badCompanionIds.size === 0) {
        return [];
      }

      const conflicts = allPlantings.filter(
        (other) =>
          other.id !== planting.id && badCompanionIds.has(other.vegetable.id),
      );

      return conflicts.map((other) =>
        this.toCandidate({
          template,
          bed,
          planting,
          scope: PlanChecklistScope.PLANTING,
          sourceKey: `plan-checklist:planting:${planting.id}:${template.slug}:${other.vegetable.id}`,
          dedupeKey: `plan-checklist:planting:${planting.id}:${template.slug}:${other.vegetable.id}`,
          values: {
            ...valuesBase,
            otherVegetableName: other.vegetable.name,
          },
          vegetableId: vegetable.id,
          metadata: {
            conflictingVegetableId: other.vegetable.id,
            conflictingVegetableName: other.vegetable.name,
          },
        }),
      );
    }

    return [];
  }

  private toCandidate(params: {
    template: PlanChecklistTemplate;
    bed: Bed;
    planting?: Planting | null;
    scope: PlanChecklistScope;
    sourceKey: string;
    dedupeKey: string;
    values: Record<string, string | number | null | undefined>;
    vegetableId?: string | null;
    soilId?: string | null;
    fertilizerId?: string | null;
    metadata?: Record<string, unknown>;
  }): CandidateItem {
    const title = this.applyTemplate(
      params.template.titleTemplate,
      params.values,
    );
    const description = params.template.descriptionTemplate
      ? this.applyTemplate(params.template.descriptionTemplate, params.values)
      : null;
    const reason = params.template.reasonTemplate
      ? this.applyTemplate(params.template.reasonTemplate, params.values)
      : null;

    return {
      sourceKey: params.sourceKey,
      dedupeKey: params.dedupeKey,
      scope: params.scope,
      priority: params.template.priority,
      title,
      description,
      reason,
      bed: params.bed,
      planting: params.planting ?? null,
      vegetableId: params.vegetableId ?? null,
      soilId: params.soilId ?? null,
      fertilizerId: params.fertilizerId ?? null,
      template: params.template,
      metadata: params.metadata ?? null,
    };
  }

  private pickFertilizerForDemand(
    demand: 'N' | 'P' | 'K',
    fertilizers: FertilizerType[],
  ) {
    const effectField =
      demand === 'N'
        ? 'nitrogenEffect'
        : demand === 'P'
          ? 'phosphorusEffect'
          : 'potassiumEffect';

    const preferred = fertilizers.find(
      (item) =>
        item[effectField] === NutrientEffect.HIGH ||
        item[effectField] === NutrientEffect.MEDIUM,
    );

    return preferred ?? null;
  }

  private applyTemplate(
    template: string,
    values: Record<string, string | number | null | undefined>,
  ) {
    return template.replace(/\{\s*([^{}\s]+)\s*\}/g, (_match, key: string) => {
      const value = values[key];
      if (value === null || value === undefined) {
        return '';
      }

      return String(value);
    });
  }

  private getTemplateConditionKind(template: PlanChecklistTemplate) {
    const kind = template.conditions?.kind;
    return typeof kind === 'string' ? kind : null;
  }

  private serializeChecklistItem(item: PlanChecklistItem) {
    return {
      id: item.id,
      scope: item.scope,
      source: item.source,
      status: item.status,
      priority: item.priority,
      title: item.title,
      description: item.description ?? null,
      reason: item.reason ?? null,
      bedId: item.bed.id,
      plantingId: item.planting?.id ?? null,
      vegetableId: item.vegetable?.id ?? null,
      soilId: item.soil?.id ?? null,
      fertilizerId: item.fertilizer?.id ?? null,
      templateId: item.template?.id ?? null,
      sourceKey: item.sourceKey ?? null,
      dedupeKey: item.dedupeKey ?? null,
      isUserModified: item.isUserModified,
      metadata: item.metadata ?? null,
      suppressedAt: item.suppressedAt ?? null,
      archivedAt: item.archivedAt ?? null,
      archiveReason: item.archiveReason ?? null,
      doneAt: item.doneAt ?? null,
      skippedAt: item.skippedAt ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
