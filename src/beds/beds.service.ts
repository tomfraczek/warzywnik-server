import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Bed } from './bed.entity';
import { Soil } from '../soils/soil.entity';
import {
  CreateBedDto,
  ListBedsQueryDto,
  UpdateBedDto,
} from './dto/bed.schemas';
import { User } from '../users/user.entity';

@Injectable()
export class BedsService {
  constructor(private readonly em: EntityManager) {}

  async list(user: User, query: ListBedsQueryDto) {
    const { page, limit, q, isActive } = query;

    const where: Record<string, unknown> = {
      user: user.id,
    };

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { locationLabel: { $ilike: `%${q}%` } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await this.em.findAndCount(Bed, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
      populate: ['soil'],
    });

    return {
      items: items.map((item) => this.serializeBed(item)),
      page,
      limit,
      total,
    };
  }

  async getById(user: User, id: string) {
    const bed = await this.em.findOne(
      Bed,
      { id, user: user.id },
      {
        populate: ['soil'],
      },
    );

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    return this.serializeBed(bed);
  }

  async create(user: User, dto: CreateBedDto) {
    const bed = new Bed();
    bed.user = user;
    bed.name = dto.name;
    bed.description = dto.description ?? null;
    bed.locationLabel = dto.locationLabel ?? null;
    bed.lengthCm = dto.lengthCm ?? null;
    bed.widthCm = dto.widthCm ?? null;
    bed.depthCm = dto.depthCm ?? null;
    bed.soilTestingEnabled = dto.soilTestingEnabled ?? false;
    bed.measuredN = dto.measuredN ?? null;
    bed.measuredP = dto.measuredP ?? null;
    bed.measuredK = dto.measuredK ?? null;
    bed.measuredPh = dto.measuredPh ?? null;
    bed.isActive = dto.isActive ?? true;

    if (dto.soilId === null) {
      bed.soil = null;
    } else if (dto.soilId) {
      const soil = await this.em.findOne(Soil, { id: dto.soilId });
      if (!soil) {
        throw new BadRequestException('Soil not found');
      }
      bed.soil = soil;
    }

    await this.em.persistAndFlush(bed);

    await this.em.populate(bed, ['soil']);
    return this.serializeBed(bed);
  }

  async update(user: User, id: string, dto: UpdateBedDto) {
    const bed = await this.em.findOne(
      Bed,
      { id, user: user.id },
      {
        populate: ['soil'],
      },
    );

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    if (dto.name !== undefined) bed.name = dto.name;
    if (dto.description !== undefined) bed.description = dto.description;
    if (dto.locationLabel !== undefined) bed.locationLabel = dto.locationLabel;
    if (dto.lengthCm !== undefined) bed.lengthCm = dto.lengthCm;
    if (dto.widthCm !== undefined) bed.widthCm = dto.widthCm;
    if (dto.depthCm !== undefined) bed.depthCm = dto.depthCm;
    if (dto.soilTestingEnabled !== undefined)
      bed.soilTestingEnabled = dto.soilTestingEnabled;
    if (dto.measuredN !== undefined) bed.measuredN = dto.measuredN;
    if (dto.measuredP !== undefined) bed.measuredP = dto.measuredP;
    if (dto.measuredK !== undefined) bed.measuredK = dto.measuredK;
    if (dto.measuredPh !== undefined) bed.measuredPh = dto.measuredPh;
    if (dto.isActive !== undefined) bed.isActive = dto.isActive;

    if (dto.soilId === null) {
      bed.soil = null;
    } else if (dto.soilId !== undefined) {
      const soil = await this.em.findOne(Soil, { id: dto.soilId });
      if (!soil) {
        throw new BadRequestException('Soil not found');
      }
      bed.soil = soil;
    }

    await this.em.flush();
    // NOTE: Bed changes (soil, depth, measurements) affect planting warnings.
    // Clients should refetch plantings for this bed after updates.
    return this.serializeBed(bed);
  }

  async remove(user: User, id: string) {
    const bed = await this.em.findOne(Bed, { id, user: user.id });
    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    bed.isActive = false;
    await this.em.flush();
  }

  private serializeBed(bed: Bed) {
    return {
      id: bed.id,
      name: bed.name,
      description: bed.description ?? null,
      locationLabel: bed.locationLabel ?? null,
      lengthCm: bed.lengthCm ?? null,
      widthCm: bed.widthCm ?? null,
      depthCm: bed.depthCm ?? null,
      soilId: bed.soil?.id ?? null,
      soilTestingEnabled: bed.soilTestingEnabled,
      measuredN: bed.measuredN ?? null,
      measuredP: bed.measuredP ?? null,
      measuredK: bed.measuredK ?? null,
      measuredPh: bed.measuredPh ?? null,
      isActive: bed.isActive,
      createdAt: bed.createdAt,
      updatedAt: bed.updatedAt,
    };
  }
}
