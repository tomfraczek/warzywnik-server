import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Soil } from './soil.entity';
import {
  CreateSoilDto,
  ListSoilsQueryDto,
  UpdateSoilDto,
} from './dto/soil.dto';

@Injectable()
export class SoilsService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListSoilsQueryDto) {
    const { page, limit, q } = query;

    const where: Record<string, unknown> = {};

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { slug: { $ilike: `%${q}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(Soil, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
    });

    return {
      items: items.map((soil) => ({
        id: soil.id,
        slug: soil.slug,
        name: soil.name,
        soilType: soil.soilType,
      })),
      page,
      limit,
      total,
    };
  }

  async getById(id: string) {
    const soil = await this.em.findOne(Soil, { id });
    if (!soil) {
      throw new NotFoundException('Soil not found');
    }

    return soil;
  }

  async create(dto: CreateSoilDto) {
    const existing = await this.em.findOne(Soil, { slug: dto.slug });
    if (existing) {
      throw new ConflictException('Soil slug already exists');
    }

    const soil = new Soil();
    soil.slug = dto.slug;
    soil.name = dto.name;
    soil.description = dto.description;
    soil.soilType = dto.soilType;
    soil.structure = dto.structure;
    soil.waterRetention = dto.waterRetention;
    soil.drainage = dto.drainage;
    soil.phMin = dto.phMin ?? null;
    soil.phMax = dto.phMax ?? null;
    soil.fertilityLevel = dto.fertilityLevel;
    soil.advantages = dto.advantages;
    soil.disadvantages = dto.disadvantages;
    soil.improvementTips = dto.improvementTips;

    await this.em.persistAndFlush(soil);
    return soil;
  }

  async update(id: string, dto: UpdateSoilDto) {
    const soil = await this.em.findOne(Soil, { id });
    if (!soil) {
      throw new NotFoundException('Soil not found');
    }

    if (dto.slug && dto.slug !== soil.slug) {
      const existing = await this.em.findOne(Soil, { slug: dto.slug });
      if (existing) {
        throw new ConflictException('Soil slug already exists');
      }
      soil.slug = dto.slug;
    }

    if (dto.name !== undefined) {
      soil.name = dto.name;
    }

    if (dto.description !== undefined) {
      soil.description = dto.description;
    }

    if (dto.soilType !== undefined) {
      soil.soilType = dto.soilType;
    }

    if (dto.structure !== undefined) {
      soil.structure = dto.structure;
    }

    if (dto.waterRetention !== undefined) {
      soil.waterRetention = dto.waterRetention;
    }

    if (dto.drainage !== undefined) {
      soil.drainage = dto.drainage;
    }

    if (dto.phMin !== undefined) {
      soil.phMin = dto.phMin ?? null;
    }

    if (dto.phMax !== undefined) {
      soil.phMax = dto.phMax ?? null;
    }

    if (dto.fertilityLevel !== undefined) {
      soil.fertilityLevel = dto.fertilityLevel;
    }

    if (dto.advantages !== undefined) {
      soil.advantages = dto.advantages;
    }

    if (dto.disadvantages !== undefined) {
      soil.disadvantages = dto.disadvantages;
    }

    if (dto.improvementTips !== undefined) {
      soil.improvementTips = dto.improvementTips;
    }

    await this.em.flush();
    return soil;
  }

  async remove(id: string) {
    const soil = await this.em.findOne(Soil, { id });
    if (!soil) {
      throw new NotFoundException('Soil not found');
    }

    await this.em.removeAndFlush(soil);
  }
}
