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
    const warnings = await this.computeWarnings(bed, vegetable);

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
    bed: Bed,
    vegetable: Vegetable,
  ): Promise<WarningResult[]> {
    const warnings: WarningResult[] = [];
    const valuesBase = {
      vegetableName: vegetable.name,
      bedName: bed.name,
    };

    if (
      bed.depthCm != null &&
      vegetable.requiredSoilDepthCm != null &&
      bed.depthCm < vegetable.requiredSoilDepthCm
    ) {
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
          const warning = await this.warningsService.buildWarning(
            WarningCode.PH_OUT_OF_RANGE,
            {
              ...valuesBase,
              measuredPh: bed.measuredPh,
              recommendedPhMin,
              recommendedPhMax,
            },
          );
          if (warning) warnings.push(warning);
        }
      }
    }

    // TODO: NPK_TOO_LOW requires a clear nutrient demand mapping.

    return warnings;
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
