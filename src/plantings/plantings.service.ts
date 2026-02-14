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
  UpdatePlantingDto,
} from './dto/planting.schemas';
import { User } from '../users/user.entity';
import { PlantingStatus } from '../common/enums/planting.enums';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';
import { WarningsService } from '../warning-rules/warnings.service';
import {
  DominantNutrientDemand,
  Month,
  NutrientNeeds,
} from '../common/enums/vegetable.enums';

type WarningResult = {
  code: WarningCode;
  severity: WarningSeverity;
  title: string;
  message: string;
  hint?: string | null;
  details?: Record<string, unknown> | null;
};

@Injectable()
export class PlantingsService {
  constructor(
    private readonly em: EntityManager,
    private readonly warningsService: WarningsService,
  ) {}

  async list(user: User, query: ListPlantingsQueryDto) {
    const { page, limit, bedId, status, fromDate, toDate } = query;

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

    const [items, total] = await this.em.findAndCount(Planting, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { plannedStartDate: 'desc' },
    });

    return {
      items: items.map((item) => this.serializePlanting(item)),
      page,
      limit,
      total,
    };
  }

  async getById(user: User, id: string) {
    const planting = await this.em.findOne(Planting, { id, user: user.id });

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    return this.serializePlanting(planting);
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
    planting.status = dto.status ?? PlantingStatus.PLANNED;
    planting.notes = dto.notes ?? null;

    await this.em.persistAndFlush(planting);

    return await this.serializeWithComputed(planting, bed, vegetable);
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

    if (dto.status !== undefined) {
      planting.status = dto.status;
    }

    if (dto.notes !== undefined) {
      planting.notes = dto.notes;
    }

    await this.em.flush();

    return await this.serializeWithComputed(planting, bed, vegetable);
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
      status: planting.status,
      notes: planting.notes ?? null,
      createdAt: planting.createdAt,
      updatedAt: planting.updatedAt,
    };
  }

  private async serializeWithComputed(
    planting: Planting,
    bed: Bed,
    vegetable: Vegetable,
  ) {
    const base = this.serializePlanting(planting);
    const harvestWindow = this.computeHarvestWindow(
      vegetable,
      planting.plannedStartDate,
    );
    const warnings = await this.computeWarnings(planting, bed, vegetable);

    return {
      ...base,
      harvestStartDate: harvestWindow?.start ?? null,
      harvestEndDate: harvestWindow?.end ?? null,
      warnings,
    };
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
  ): Promise<WarningResult[]> {
    const warnings: WarningResult[] = [];
    const valuesBase = {
      vegetableName: vegetable.name,
      bedName: bed.name,
    };

    let hasDepthTooSmall = false;
    let hasSoilNotRecommended = false;
    let hasPhOutOfRange = false;

    if (
      bed.depthCm != null &&
      vegetable.requiredSoilDepthCm != null &&
      bed.depthCm < vegetable.requiredSoilDepthCm
    ) {
      hasDepthTooSmall = true;
      const requiredDepthCm = vegetable.requiredSoilDepthCm;
      const warning = await this.warningsService.buildWarning(
        WarningCode.DEPTH_TOO_SMALL,
        {
          ...valuesBase,
          bedDepthCm: bed.depthCm,
          requiredDepthCm,
        },
      );

      if (warning) warnings.push(warning);
    }

    const recommendedSoils = vegetable.recommendedSoils.getItems();

    if (bed.soil && recommendedSoils.length > 0) {
      const matches = recommendedSoils.some((soil) => soil.id === bed.soil?.id);
      if (!matches) {
        hasSoilNotRecommended = true;
        const warning = await this.warningsService.buildWarning(
          WarningCode.SOIL_NOT_RECOMMENDED,
          valuesBase,
        );
        if (warning) warnings.push(warning);
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
          const warning = await this.warningsService.buildWarning(
            WarningCode.PH_OUT_OF_RANGE,
            {
              ...valuesBase,
              measuredPh: bed.measuredPh,
              recommendedPhMin,
              recommendedPhMax,
              direction,
              directionText,
              phThreshold,
              phDelta,
            },
          );
          if (warning) warnings.push(warning);
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
          const warning = await this.warningsService.buildWarning(
            WarningCode.NPK_TOO_LOW,
            {
              ...valuesBase,
              nutrient: nutrientKey,
              needLevel: nutrientNeed,
              measuredLevel,
              deficit,
            },
          );
          if (warning) warnings.push(warning);
        }
      }
    }

    const familyRepetitionWarning = await this.buildFamilyRepetitionWarning(
      planting,
      bed,
      vegetable,
      valuesBase,
    );
    if (familyRepetitionWarning) warnings.push(familyRepetitionWarning);

    const harvestWindowMissedWarning =
      await this.buildHarvestWindowMissedWarning(
        planting,
        vegetable,
        valuesBase,
      );
    if (harvestWindowMissedWarning) warnings.push(harvestWindowMissedWarning);

    const suboptimalSowingWarning = await this.buildSuboptimalSowingWarning(
      planting,
      vegetable,
      valuesBase,
    );
    if (suboptimalSowingWarning) warnings.push(suboptimalSowingWarning);

    if (hasDepthTooSmall && hasSoilNotRecommended && hasPhOutOfRange) {
      const warning = await this.warningsService.buildWarning(
        WarningCode.EXPERIMENTAL_SETUP as WarningCode,
        valuesBase,
      );
      if (warning) warnings.push(warning);
    }

    return warnings;
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

  private async buildFamilyRepetitionWarning(
    planting: Planting,
    bed: Bed,
    vegetable: Vegetable,
    valuesBase: Record<string, string | number>,
  ) {
    if (!vegetable.family) return null;
    const cutoff = this.addDays(planting.plannedStartDate, -365);
    const previousPlantings = await this.em.find(
      Planting,
      {
        bed: bed.id,
        plannedStartDate: { $gte: cutoff, $lt: planting.plannedStartDate },
        id: { $ne: planting.id },
        status: { $ne: PlantingStatus.CANCELLED },
      },
      { populate: ['vegetable'] },
    );

    const hasSameFamily = previousPlantings.some(
      (item) => item.vegetable.family === vegetable.family,
    );

    if (!hasSameFamily) return null;

    return this.warningsService.buildWarning(
      WarningCode.FAMILY_REPETITION as WarningCode,
      {
        ...valuesBase,
        familyName: vegetable.family,
      },
    );
  }

  private async buildHarvestWindowMissedWarning(
    planting: Planting,
    vegetable: Vegetable,
    valuesBase: Record<string, string | number>,
  ) {
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

    return this.warningsService.buildWarning(
      WarningCode.HARVEST_WINDOW_MISSED as WarningCode,
      {
        ...valuesBase,
        harvestEndDate: harvestEndDate.toISOString(),
      },
    );
  }

  private async buildSuboptimalSowingWarning(
    planting: Planting,
    vegetable: Vegetable,
    valuesBase: Record<string, string | number>,
  ) {
    const sowingMethods = vegetable.sowingMethods ?? [];
    if (sowingMethods.length === 0) return null;

    const plannedMonth = this.getMonthEnumFromDate(planting.plannedStartDate);
    const inAnyWindow = sowingMethods.some((method) =>
      this.isMonthInRange(plannedMonth, method.startMonth, method.endMonth),
    );

    if (inAnyWindow) return null;

    const reference = sowingMethods[0];
    return this.warningsService.buildWarning(
      WarningCode.SUBOPTIMAL_SOWING_TIME as WarningCode,
      {
        ...valuesBase,
        plannedStartDate: planting.plannedStartDate.toISOString(),
        sowingStartMonth: reference.startMonth,
        sowingEndMonth: reference.endMonth,
      },
    );
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
}
