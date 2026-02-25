import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Planting } from './planting.entity';
import { Bed } from '../beds/bed.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import {
  CreatePlantingDto,
  ListPlantingsQueryDto,
  RecomputePlantingActionsDto,
  UpdatePlantingDto,
} from './dto/planting.schemas';
import { User } from '../users/user.entity';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { WarningCode } from '../common/enums/warning.enums';
import {
  WarningsService,
  WarningCandidate,
  WarningOutput,
  WarningRulesMap,
} from '../warning-rules/warnings.service';
import {
  DemandLevel as VegetableDemandLevel,
  DominantNutrientDemand,
  Month,
  NutrientNeeds,
  RotationGroup,
} from '../common/enums/vegetable.enums';
import { DemandLevel as SoilDemandLevel } from '../common/enums/soil.enums';
import { ActionAutomationService } from '../action-tasks/action-automation.service';

type WarningResult = WarningOutput;

@Injectable()
export class PlantingsService {
  constructor(
    private readonly em: EntityManager,
    private readonly warningsService: WarningsService,
    private readonly actionAutomationService: ActionAutomationService,
  ) {}

  async list(user: User, query: ListPlantingsQueryDto) {
    const { page, limit, bedId, status, fromDate, toDate, includeWarnings } =
      query;

    const where: Record<string, unknown> = {
      user: user.id,
    };

    if (bedId) {
      where.bed = bedId;
    }

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      const range: Record<string, Date> = {};
      if (fromDate) {
        range.$gte = this.parseDate(fromDate, 'fromDate');
      }
      if (toDate) {
        range.$lte = this.parseDate(toDate, 'toDate');
      }
      where.plannedStartDate = range;
    }

    const populate = includeWarnings
      ? ([
          'bed',
          'bed.soil',
          'vegetable',
          'vegetable.recommendedSoils',
        ] as const)
      : (['bed', 'vegetable'] as const);

    const [items, total] = await this.em.findAndCount(Planting, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { plannedStartDate: 'desc' },
      populate,
    });

    const rulesMap = includeWarnings
      ? await this.warningsService.getRulesMap(Object.values(WarningCode))
      : undefined;

    return {
      items: await Promise.all(
        items.map((item) =>
          this.serializeWithComputed(item, item.bed, item.vegetable, {
            includeWarnings: Boolean(includeWarnings),
            rulesMap,
          }),
        ),
      ),
      page,
      limit,
      total,
    };
  }

  async getById(user: User, id: string, includeWarnings = false) {
    const populate = includeWarnings
      ? ([
          'bed',
          'bed.soil',
          'vegetable',
          'vegetable.recommendedSoils',
        ] as const)
      : (['bed', 'vegetable'] as const);

    const planting = await this.em.findOne(
      Planting,
      { id, user: user.id },
      { populate },
    );

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    return this.serializeWithComputed(
      planting,
      planting.bed,
      planting.vegetable,
      {
        includeWarnings,
        rulesMap: includeWarnings
          ? await this.warningsService.getRulesMap(Object.values(WarningCode))
          : undefined,
      },
    );
  }

  async create(user: User, dto: CreatePlantingDto) {
    const bed = await this.em.findOne(
      Bed,
      { id: dto.bedId, user: user.id },
      { populate: ['soil'] },
    );

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    const vegetable = await this.em.findOne(
      Vegetable,
      { id: dto.vegetableId },
      { populate: ['recommendedSoils'] },
    );

    if (!vegetable) {
      throw new NotFoundException('Vegetable not found');
    }

    const planting = new Planting();
    planting.user = user;
    planting.bed = bed;
    planting.vegetable = vegetable;
    planting.plannedStartDate = this.parseDate(
      dto.plannedStartDate,
      'plannedStartDate',
    );
    planting.actualStartDate = dto.actualStartDate
      ? this.parseDate(dto.actualStartDate, 'actualStartDate')
      : null;
    planting.startMethod = dto.startMethod ?? PlantingStartMethod.DIRECT_SOW;
    planting.sowedAt = dto.sowedAt
      ? this.parseDate(dto.sowedAt, 'sowedAt')
      : null;
    planting.transplantedAt = dto.transplantedAt
      ? this.parseDate(dto.transplantedAt, 'transplantedAt')
      : null;
    planting.harvestWindowStart = dto.harvestWindowStart
      ? this.parseDate(dto.harvestWindowStart, 'harvestWindowStart')
      : null;
    planting.harvestWindowEnd = dto.harvestWindowEnd
      ? this.parseDate(dto.harvestWindowEnd, 'harvestWindowEnd')
      : null;
    planting.timelineTimezone = dto.timelineTimezone ?? 'Europe/Warsaw';
    planting.appliedRulesVersion = vegetable.rulesVersion;
    planting.status = dto.status ?? PlantingStatus.PLANNED;
    planting.notes = dto.notes ?? null;

    this.validatePlantingTimeline(planting);

    await this.em.persistAndFlush(planting);

    await this.actionAutomationService.recomputeForPlanting({
      user,
      plantingId: planting.id,
      reason: 'PLANTING_CREATED',
    });

    return await this.serializeWithComputed(planting, bed, vegetable, {
      includeWarnings: true,
    });
  }

  async update(user: User, id: string, dto: UpdatePlantingDto) {
    const planting = await this.em.findOne(
      Planting,
      { id, user: user.id },
      {
        populate: ['bed', 'vegetable'],
      },
    );

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    let bed = planting.bed;
    let vegetable = planting.vegetable;

    if (dto.bedId !== undefined) {
      const newBed = await this.em.findOne(
        Bed,
        { id: dto.bedId, user: user.id },
        { populate: ['soil'] },
      );
      if (!newBed) {
        throw new NotFoundException('Bed not found');
      }
      bed = newBed;
      planting.bed = newBed;
    } else {
      await this.em.populate(bed, ['soil']);
    }

    if (dto.vegetableId !== undefined) {
      const newVegetable = await this.em.findOne(
        Vegetable,
        { id: dto.vegetableId },
        { populate: ['recommendedSoils'] },
      );
      if (!newVegetable) {
        throw new NotFoundException('Vegetable not found');
      }
      vegetable = newVegetable;
      planting.vegetable = newVegetable;
      planting.appliedRulesVersion = newVegetable.rulesVersion;
    } else {
      await this.em.populate(vegetable, ['recommendedSoils']);
    }

    if (dto.plannedStartDate !== undefined) {
      planting.plannedStartDate = this.parseDate(
        dto.plannedStartDate,
        'plannedStartDate',
      );
    }

    if (dto.actualStartDate !== undefined) {
      planting.actualStartDate = dto.actualStartDate
        ? this.parseDate(dto.actualStartDate, 'actualStartDate')
        : null;
    }

    if (dto.startMethod !== undefined) {
      planting.startMethod = dto.startMethod;
    }

    if (dto.sowedAt !== undefined) {
      planting.sowedAt = dto.sowedAt
        ? this.parseDate(dto.sowedAt, 'sowedAt')
        : null;
    }

    if (dto.transplantedAt !== undefined) {
      planting.transplantedAt = dto.transplantedAt
        ? this.parseDate(dto.transplantedAt, 'transplantedAt')
        : null;
    }

    if (dto.harvestWindowStart !== undefined) {
      planting.harvestWindowStart = dto.harvestWindowStart
        ? this.parseDate(dto.harvestWindowStart, 'harvestWindowStart')
        : null;
    }

    if (dto.harvestWindowEnd !== undefined) {
      planting.harvestWindowEnd = dto.harvestWindowEnd
        ? this.parseDate(dto.harvestWindowEnd, 'harvestWindowEnd')
        : null;
    }

    if (dto.timelineTimezone !== undefined) {
      planting.timelineTimezone = dto.timelineTimezone;
    }

    if (dto.status !== undefined) {
      planting.status = dto.status;
    }

    if (dto.notes !== undefined) {
      planting.notes = dto.notes;
    }

    this.validatePlantingTimeline(planting);

    await this.em.flush();

    await this.actionAutomationService.recomputeForPlanting({
      user,
      plantingId: planting.id,
      reason: 'PLANTING_TIMELINE_UPDATED',
    });

    return await this.serializeWithComputed(planting, bed, vegetable, {
      includeWarnings: true,
    });
  }

  async recomputeActions(
    user: User,
    plantingId: string,
    dto: RecomputePlantingActionsDto,
  ) {
    return this.actionAutomationService.recomputeForPlanting({
      user,
      plantingId,
      reason: 'MANUAL_RECOMPUTE',
      forceOverrideManual: dto.forceOverrideManual,
      useLatestRules: dto.useLatestRules,
    });
  }

  async remove(user: User, id: string) {
    const planting = await this.em.findOne(Planting, { id, user: user.id });
    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    planting.status = PlantingStatus.CANCELLED;
    await this.em.flush();
  }

  private serializePlanting(planting: Planting) {
    return {
      id: planting.id,
      bedId: planting.bed.id,
      vegetableId: planting.vegetable.id,
      plannedStartDate: planting.plannedStartDate,
      actualStartDate: planting.actualStartDate ?? null,
      startMethod: planting.startMethod,
      sowedAt: planting.sowedAt ?? null,
      transplantedAt: planting.transplantedAt ?? null,
      harvestWindowStart: planting.harvestWindowStart ?? null,
      harvestWindowEnd: planting.harvestWindowEnd ?? null,
      timelineTimezone: planting.timelineTimezone,
      appliedRulesVersion: planting.appliedRulesVersion,
      status: planting.status,
      harvestedAt: planting.harvestedAt ?? null,
      notes: planting.notes ?? null,
      createdAt: planting.createdAt,
      updatedAt: planting.updatedAt,
    };
  }

  private async serializeWithComputed(
    planting: Planting,
    bed: Bed,
    vegetable: Vegetable,
    options: {
      includeWarnings: boolean;
      rulesMap?: WarningRulesMap;
    },
  ) {
    const base = this.serializePlanting(planting);
    const harvestWindow = this.computeHarvestWindow(
      vegetable,
      planting.plannedStartDate,
    );
    const result: Record<string, unknown> = {
      ...base,
      harvestStartDate: harvestWindow?.start ?? null,
      harvestEndDate: harvestWindow?.end ?? null,
    };

    if (options.includeWarnings) {
      const warnings = await this.computeWarnings(
        planting,
        bed,
        vegetable,
        options.rulesMap,
      );
      result.warnings = warnings;
    }

    return result;
  }

  private computeHarvestWindow(vegetable: Vegetable, plannedStart: Date) {
    if (
      vegetable.timeToHarvestDaysMin == null ||
      vegetable.timeToHarvestDaysMax == null
    ) {
      return null;
    }

    const start = this.addDays(plannedStart, vegetable.timeToHarvestDaysMin);
    const end = this.addDays(plannedStart, vegetable.timeToHarvestDaysMax);

    return { start, end };
  }

  private async computeWarnings(
    planting: Planting,
    bed: Bed,
    vegetable: Vegetable,
    rulesMap?: WarningRulesMap,
  ): Promise<WarningResult[]> {
    const candidates: WarningCandidate[] = [];
    const valuesBase = {
      vegetableName: vegetable.name,
      bedName: bed.name,
    };

    let hasDepthTooSmall = false;
    let hasSoilNotRecommended = false;
    let hasPhOutOfRange = false;

    if (
      bed.depthCm != null &&
      vegetable.minSoilDepthCm != null &&
      bed.depthCm < vegetable.minSoilDepthCm
    ) {
      hasDepthTooSmall = true;
      const requiredDepthCm = vegetable.minSoilDepthCm;
      candidates.push({
        code: WarningCode.DEPTH_TOO_SMALL,
        values: {
          ...valuesBase,
          bedDepthCm: bed.depthCm,
          requiredDepthCm,
        },
      });
    }

    const recommendedSoils = vegetable.recommendedSoils.getItems();

    if (bed.soil && recommendedSoils.length > 0) {
      const matches = recommendedSoils.some((soil) => soil.id === bed.soil?.id);
      if (!matches) {
        hasSoilNotRecommended = true;
        candidates.push({
          code: WarningCode.SOIL_NOT_RECOMMENDED,
          values: valuesBase,
        });
      }
    }

    if (
      bed.soilTestingEnabled === true &&
      bed.measuredPh != null &&
      recommendedSoils.length > 0
    ) {
      const minValues = recommendedSoils
        .map((soil) => soil.phMin)
        .filter((value): value is number => value != null);
      const maxValues = recommendedSoils
        .map((soil) => soil.phMax)
        .filter((value): value is number => value != null);

      if (minValues.length > 0 && maxValues.length > 0) {
        const recommendedPhMin = Math.min(...minValues);
        const recommendedPhMax = Math.max(...maxValues);
        if (
          bed.measuredPh < recommendedPhMin ||
          bed.measuredPh > recommendedPhMax
        ) {
          const direction = bed.measuredPh < recommendedPhMin ? 'LOW' : 'HIGH';
          const directionText =
            direction === 'LOW' ? 'zbyt niskie' : 'zbyt wysokie';
          const phThreshold =
            direction === 'LOW' ? recommendedPhMin : recommendedPhMax;
          const phDelta = Math.abs(bed.measuredPh - phThreshold);
          hasPhOutOfRange = true;
          candidates.push({
            code: WarningCode.PH_OUT_OF_RANGE,
            values: {
              ...valuesBase,
              measuredPh: bed.measuredPh,
              recommendedPhMin,
              recommendedPhMax,
              direction,
              directionText,
              phThreshold,
              phDelta,
            },
          });
        }
      }
    }

    if (bed.soilTestingEnabled === true) {
      const nutrientNeed = this.mapNutrientNeedToLevel(vegetable.nutrientNeeds);
      const nutrientKey = this.getDominantNutrientKey(
        vegetable.dominantNutrientDemand,
      );
      if (nutrientNeed != null && nutrientKey) {
        const measuredLevel = this.getMeasuredNutrientLevel(bed, nutrientKey);
        if (measuredLevel != null && measuredLevel < nutrientNeed) {
          const deficit = Math.max(0, nutrientNeed - measuredLevel);
          candidates.push({
            code: WarningCode.NPK_TOO_LOW,
            values: {
              ...valuesBase,
              nutrient: nutrientKey,
              needLevel: nutrientNeed,
              measuredLevel,
              deficit,
            },
          });
        }
      }
    }

    const waterRetentionCandidate = this.buildWaterRetentionMismatchCandidate(
      bed,
      vegetable,
      valuesBase,
    );
    if (waterRetentionCandidate) candidates.push(waterRetentionCandidate);

    // TODO: DRAINAGE_MISMATCH requires vegetable drainage preference, which is not modeled yet.
    // Once Vegetable exposes drainage demand, compute mismatch here and emit warning.

    const previousPlantings = await this.getPreviousPlantings(planting, bed);

    const familyRepetitionCandidate = this.buildFamilyRepetitionCandidate(
      vegetable,
      valuesBase,
      previousPlantings,
    );
    if (familyRepetitionCandidate) candidates.push(familyRepetitionCandidate);

    const rotationRiskCandidate = this.buildRotationRiskCandidate(
      vegetable,
      valuesBase,
      previousPlantings,
    );
    if (rotationRiskCandidate) candidates.push(rotationRiskCandidate);

    const harvestWindowMissedCandidate = this.buildHarvestWindowMissedCandidate(
      planting,
      vegetable,
      valuesBase,
    );
    if (harvestWindowMissedCandidate)
      candidates.push(harvestWindowMissedCandidate);

    const suboptimalSowingCandidate = this.buildSuboptimalSowingCandidate(
      planting,
      vegetable,
      valuesBase,
    );
    if (suboptimalSowingCandidate) candidates.push(suboptimalSowingCandidate);

    if (hasDepthTooSmall && hasSoilNotRecommended && hasPhOutOfRange) {
      candidates.push({
        code: WarningCode.EXPERIMENTAL_SETUP,
        values: valuesBase,
      });
    }

    return this.warningsService.buildWarnings(candidates, rulesMap);
  }

  private mapNutrientNeedToLevel(level?: NutrientNeeds | null): number | null {
    switch (level) {
      case NutrientNeeds.LOW:
        return 1;
      case NutrientNeeds.MEDIUM:
        return 2;
      case NutrientNeeds.HIGH:
        return 3;
      default:
        return null;
    }
  }

  private mapDemandLevelToScore(
    level?: VegetableDemandLevel | SoilDemandLevel | null,
  ): number | null {
    switch (level) {
      case VegetableDemandLevel.LOW:
        return 1;
      case VegetableDemandLevel.MEDIUM:
        return 2;
      case VegetableDemandLevel.HIGH:
        return 3;
      default:
        return null;
    }
  }

  private isDemandMismatch(soilScore: number, vegetableScore: number) {
    return Math.abs(soilScore - vegetableScore) >= 2;
  }

  private getDominantNutrientKey(
    demand?: DominantNutrientDemand | null,
  ): 'N' | 'P' | 'K' | null {
    switch (demand) {
      case DominantNutrientDemand.N:
        return 'N';
      case DominantNutrientDemand.P:
        return 'P';
      case DominantNutrientDemand.K:
        return 'K';
      default:
        return null;
    }
  }

  private getMeasuredNutrientLevel(bed: Bed, nutrient: 'N' | 'P' | 'K') {
    if (nutrient === 'N') return bed.measuredN ?? null;
    if (nutrient === 'P') return bed.measuredP ?? null;
    return bed.measuredK ?? null;
  }

  private async getPreviousPlantings(planting: Planting, bed: Bed) {
    const cutoff = this.addDays(planting.plannedStartDate, -365);
    return this.em.find(
      Planting,
      {
        bed: bed.id,
        plannedStartDate: { $gte: cutoff, $lt: planting.plannedStartDate },
        id: { $ne: planting.id },
        status: { $ne: PlantingStatus.CANCELLED },
      },
      { populate: ['vegetable'] },
    );
  }

  private buildFamilyRepetitionCandidate(
    vegetable: Vegetable,
    valuesBase: Record<string, string | number>,
    previousPlantings: Planting[],
  ): WarningCandidate | null {
    if (!vegetable.family) return null;
    const hasSameFamily = previousPlantings.some(
      (item) => item.vegetable.family === vegetable.family,
    );
    if (!hasSameFamily) return null;

    return {
      code: WarningCode.FAMILY_REPETITION,
      values: {
        ...valuesBase,
        familyName: vegetable.family,
      },
    };
  }

  private buildRotationRiskCandidate(
    vegetable: Vegetable,
    valuesBase: Record<string, string | number>,
    previousPlantings: Planting[],
  ): WarningCandidate | null {
    if (!vegetable.rotationGroup) return null;
    if (vegetable.rotationGroup === RotationGroup.OTHER) return null;

    const hasSameGroup = previousPlantings.some(
      (item) => item.vegetable.rotationGroup === vegetable.rotationGroup,
    );

    if (!hasSameGroup) return null;

    return {
      code: WarningCode.ROTATION_RISK,
      values: {
        ...valuesBase,
        rotationGroup: vegetable.rotationGroup,
      },
    };
  }

  private buildWaterRetentionMismatchCandidate(
    bed: Bed,
    vegetable: Vegetable,
    valuesBase: Record<string, string | number>,
  ): WarningCandidate | null {
    if (!bed.soil || bed.soil.waterRetention == null) return null;
    if (vegetable.waterDemand == null) return null;

    const soilScore = this.mapDemandLevelToScore(bed.soil.waterRetention);
    const vegetableScore = this.mapDemandLevelToScore(vegetable.waterDemand);

    if (soilScore == null || vegetableScore == null) return null;
    if (!this.isDemandMismatch(soilScore, vegetableScore)) return null;

    return {
      code: WarningCode.WATER_RETENTION_MISMATCH,
      values: {
        ...valuesBase,
        soilWaterRetention: bed.soil.waterRetention,
        vegetableWaterDemand: vegetable.waterDemand,
      },
    };
  }

  private buildHarvestWindowMissedCandidate(
    planting: Planting,
    vegetable: Vegetable,
    valuesBase: Record<string, string | number>,
  ): WarningCandidate | null {
    if (
      planting.status !== PlantingStatus.ACTIVE &&
      planting.status !== PlantingStatus.HARVESTING
    ) {
      return null;
    }

    if (vegetable.timeToHarvestDaysMax == null) return null;

    const harvestEndDate = this.addDays(
      planting.plannedStartDate,
      vegetable.timeToHarvestDaysMax,
    );

    if (new Date() <= harvestEndDate) return null;

    return {
      code: WarningCode.HARVEST_WINDOW_MISSED,
      values: {
        ...valuesBase,
        harvestEndDate: harvestEndDate.toISOString(),
      },
    };
  }

  private buildSuboptimalSowingCandidate(
    planting: Planting,
    vegetable: Vegetable,
    valuesBase: Record<string, string | number>,
  ): WarningCandidate | null {
    const sowingMethods = vegetable.sowingMethods ?? [];
    if (sowingMethods.length === 0) return null;

    const plannedMonth = this.getMonthEnumFromDate(planting.plannedStartDate);
    const inAnyWindow = sowingMethods.some((method) =>
      this.isMonthInRange(plannedMonth, method.startMonth, method.endMonth),
    );

    if (inAnyWindow) return null;

    const reference = sowingMethods[0];
    return {
      code: WarningCode.SUBOPTIMAL_SOWING_TIME,
      values: {
        ...valuesBase,
        plannedStartDate: planting.plannedStartDate.toISOString(),
        sowingStartMonth: reference.startMonth,
        sowingEndMonth: reference.endMonth,
      },
    };
  }

  private getMonthEnumFromDate(date: Date): Month {
    const order: Month[] = [
      Month.JANUARY,
      Month.FEBRUARY,
      Month.MARCH,
      Month.APRIL,
      Month.MAY,
      Month.JUNE,
      Month.JULY,
      Month.AUGUST,
      Month.SEPTEMBER,
      Month.OCTOBER,
      Month.NOVEMBER,
      Month.DECEMBER,
    ];
    return order[date.getMonth()];
  }

  private isMonthInRange(month: Month, start: Month, end: Month) {
    const order: Month[] = [
      Month.JANUARY,
      Month.FEBRUARY,
      Month.MARCH,
      Month.APRIL,
      Month.MAY,
      Month.JUNE,
      Month.JULY,
      Month.AUGUST,
      Month.SEPTEMBER,
      Month.OCTOBER,
      Month.NOVEMBER,
      Month.DECEMBER,
    ];
    const monthIndex = order.indexOf(month);
    const startIndex = order.indexOf(start);
    const endIndex = order.indexOf(end);

    if (startIndex <= endIndex) {
      return monthIndex >= startIndex && monthIndex <= endIndex;
    }
    return monthIndex >= startIndex || monthIndex <= endIndex;
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }
    return date;
  }

  private validatePlantingTimeline(planting: Planting) {
    if (planting.startMethod === PlantingStartMethod.DIRECT_SOW) {
      if (!planting.sowedAt) {
        throw new BadRequestException('sowedAt is required for DIRECT_SOW');
      }
      if (planting.transplantedAt) {
        throw new BadRequestException(
          'transplantedAt must be null for DIRECT_SOW',
        );
      }
    }

    if (
      planting.harvestWindowStart &&
      planting.harvestWindowEnd &&
      planting.harvestWindowStart > planting.harvestWindowEnd
    ) {
      throw new BadRequestException(
        'harvestWindowStart must be less than or equal to harvestWindowEnd',
      );
    }
  }
}
