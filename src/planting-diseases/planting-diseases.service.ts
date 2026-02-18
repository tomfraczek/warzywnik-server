import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { PlantingDisease } from './planting-disease.entity';
import {
  CreatePlantingDiseaseDto,
  ListPlantingDiseasesQueryDto,
  UpdatePlantingDiseaseDto,
} from './dto/planting-disease.schemas';
import { Planting } from '../plantings/planting.entity';
import { Disease } from '../diseases/disease.entity';
import { User } from '../users/user.entity';
import { PlantingDiseaseStatus } from '../common/enums/planting-disease.enums';
import { RemindersService } from '../reminders/reminders.service';

@Injectable()
export class PlantingDiseasesService {
  private readonly logger = new Logger(PlantingDiseasesService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly remindersService: RemindersService,
  ) {}

  async list(
    user: User,
    plantingId: string,
    query: ListPlantingDiseasesQueryDto,
  ) {
    await this.getPlantingOrThrow(user, plantingId);

    const where: Record<string, unknown> = {
      planting: plantingId,
    };

    if (query.status === 'active') {
      where.status = { $ne: PlantingDiseaseStatus.RESOLVED };
    } else if (query.status === 'resolved') {
      where.status = PlantingDiseaseStatus.RESOLVED;
    }

    const items = await this.em.find(PlantingDisease, where, {
      populate: ['disease'],
      orderBy: { observedAt: 'desc' },
    });

    return items.map((item) => this.serialize(item));
  }

  async create(user: User, plantingId: string, dto: CreatePlantingDiseaseDto) {
    const planting = await this.getPlantingOrThrow(user, plantingId);

    const disease = await this.em.findOne(Disease, { id: dto.diseaseId });
    if (!disease) {
      throw new NotFoundException('Disease not found');
    }

    const existing = await this.em.findOne(PlantingDisease, {
      planting: planting.id,
      disease: disease.id,
      status: { $ne: PlantingDiseaseStatus.RESOLVED },
    });

    if (existing) {
      throw new ConflictException('Active disease occurrence already exists');
    }

    const occurrence = new PlantingDisease();
    occurrence.planting = planting;
    occurrence.disease = disease;
    occurrence.status = dto.status ?? PlantingDiseaseStatus.SUSPECTED;
    occurrence.severity = dto.severity ?? null;
    occurrence.observedAt = dto.observedAt
      ? this.parseDate(dto.observedAt, 'observedAt')
      : new Date();
    occurrence.notes = dto.notes ?? null;

    await this.em.persistAndFlush(occurrence);

    await this.remindersService.createForPlantingDisease({
      user,
      planting,
      disease,
      plantingDisease: occurrence,
    });

    this.logger.log(
      `created planting disease occurrence=${occurrence.id} | planting=${planting.id} | disease=${disease.id} | status=${occurrence.status}`,
    );

    await this.em.populate(occurrence, ['disease']);
    return this.serialize(occurrence);
  }

  async update(
    user: User,
    plantingId: string,
    id: string,
    dto: UpdatePlantingDiseaseDto,
  ) {
    const planting = await this.getPlantingOrThrow(user, plantingId);

    const occurrence = await this.em.findOne(
      PlantingDisease,
      { id, planting: planting.id },
      { populate: ['disease'] },
    );

    if (!occurrence) {
      throw new NotFoundException('Planting disease not found');
    }

    if (dto.status !== undefined) {
      if (dto.status !== PlantingDiseaseStatus.RESOLVED) {
        await this.ensureNoActiveDuplicate(occurrence, dto.status);
      }

      const previousStatus = occurrence.status;
      occurrence.status = dto.status;

      await this.remindersService.updateForPlantingDiseaseStatusChange({
        user,
        planting,
        disease: occurrence.disease,
        plantingDisease: occurrence,
        previousStatus,
      });
    }

    if (dto.severity !== undefined) {
      occurrence.severity = dto.severity;
    }

    if (dto.observedAt !== undefined) {
      occurrence.observedAt = this.parseDate(dto.observedAt, 'observedAt');
    }

    if (dto.notes !== undefined) {
      occurrence.notes = dto.notes;
    }

    await this.em.flush();

    this.logger.log(
      `updated planting disease occurrence=${occurrence.id} | status=${occurrence.status}`,
    );

    return this.serialize(occurrence);
  }

  private async ensureNoActiveDuplicate(
    occurrence: PlantingDisease,
    newStatus: PlantingDiseaseStatus,
  ) {
    if (newStatus === PlantingDiseaseStatus.RESOLVED) {
      return;
    }

    const existing = await this.em.findOne(PlantingDisease, {
      id: { $ne: occurrence.id },
      planting: occurrence.planting.id,
      disease: occurrence.disease.id,
      status: { $ne: PlantingDiseaseStatus.RESOLVED },
    });

    if (existing) {
      throw new ConflictException('Active disease occurrence already exists');
    }
  }

  private async getPlantingOrThrow(user: User, plantingId: string) {
    const planting = await this.em.findOne(Planting, {
      id: plantingId,
      user: user.id,
    });

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    return planting;
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }
    return date;
  }

  private serialize(entity: PlantingDisease) {
    return {
      id: entity.id,
      plantingId: entity.planting.id,
      disease: entity.disease
        ? {
            id: entity.disease.id,
            slug: entity.disease.slug,
            name: entity.disease.name,
          }
        : null,
      status: entity.status,
      severity: entity.severity ?? null,
      observedAt: entity.observedAt,
      notes: entity.notes ?? null,
      reminderCount: entity.reminderCount,
      nextCheckAt: entity.nextCheckAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
