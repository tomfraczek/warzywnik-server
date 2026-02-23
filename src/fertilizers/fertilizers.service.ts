import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FertilizerType } from './fertilizer-type.entity';
import {
  CreateFertilizerTypeDto,
  ListFertilizerTypesQueryDto,
  UpdateFertilizerTypeDto,
} from './dto/fertilizer.schemas';

@Injectable()
export class FertilizersService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListFertilizerTypesQueryDto) {
    const { page, limit, q, category, isActive } = query;

    const where: Record<string, unknown> = {};

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await this.em.findAndCount(FertilizerType, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
    });

    return {
      items,
      page,
      limit,
      total,
    };
  }

  async getById(id: string) {
    const entity = await this.em.findOne(FertilizerType, { id });

    if (!entity) {
      throw new NotFoundException('Fertilizer type not found');
    }

    return entity;
  }

  async create(dto: CreateFertilizerTypeDto) {
    const existing = await this.em.findOne(FertilizerType, {
      name: { $ilike: dto.name },
    });
    if (existing) {
      throw new ConflictException('Fertilizer type name already exists');
    }

    const fertilizer = new FertilizerType();
    fertilizer.name = dto.name;
    fertilizer.description = dto.description;
    fertilizer.category = dto.category;
    fertilizer.form = dto.form;
    fertilizer.applicationMethod = dto.applicationMethod;
    fertilizer.riskLevel = dto.riskLevel;
    fertilizer.nitrogenEffect = dto.nitrogenEffect;
    fertilizer.phosphorusEffect = dto.phosphorusEffect;
    fertilizer.potassiumEffect = dto.potassiumEffect;
    fertilizer.phEffect = dto.phEffect;
    fertilizer.soilStructureEffect = dto.soilStructureEffect;
    fertilizer.waterRetentionEffect = dto.waterRetentionEffect;
    fertilizer.drainageEffect = dto.drainageEffect;
    fertilizer.recommendedFrequency = dto.recommendedFrequency;
    fertilizer.dosageGuidance = dto.dosageGuidance ?? null;
    fertilizer.notes = dto.notes ?? null;
    fertilizer.isActive = dto.isActive ?? true;

    await this.em.persistAndFlush(fertilizer);
    return fertilizer;
  }

  async update(id: string, dto: UpdateFertilizerTypeDto) {
    const fertilizer = await this.em.findOne(FertilizerType, { id });
    if (!fertilizer) {
      throw new NotFoundException('Fertilizer type not found');
    }

    if (dto.name && dto.name !== fertilizer.name) {
      const existing = await this.em.findOne(FertilizerType, {
        id: { $ne: id },
        name: { $ilike: dto.name },
      });
      if (existing) {
        throw new ConflictException('Fertilizer type name already exists');
      }
      fertilizer.name = dto.name;
    }

    if (dto.name !== undefined && dto.name === fertilizer.name) {
      fertilizer.name = dto.name;
    }

    if (dto.description !== undefined) {
      fertilizer.description = dto.description;
    }

    if (dto.category !== undefined) {
      fertilizer.category = dto.category;
    }

    if (dto.form !== undefined) {
      fertilizer.form = dto.form;
    }

    if (dto.applicationMethod !== undefined) {
      fertilizer.applicationMethod = dto.applicationMethod;
    }

    if (dto.riskLevel !== undefined) {
      fertilizer.riskLevel = dto.riskLevel;
    }

    if (dto.nitrogenEffect !== undefined) {
      fertilizer.nitrogenEffect = dto.nitrogenEffect;
    }

    if (dto.phosphorusEffect !== undefined) {
      fertilizer.phosphorusEffect = dto.phosphorusEffect;
    }

    if (dto.potassiumEffect !== undefined) {
      fertilizer.potassiumEffect = dto.potassiumEffect;
    }

    if (dto.phEffect !== undefined) {
      fertilizer.phEffect = dto.phEffect;
    }

    if (dto.soilStructureEffect !== undefined) {
      fertilizer.soilStructureEffect = dto.soilStructureEffect;
    }

    if (dto.waterRetentionEffect !== undefined) {
      fertilizer.waterRetentionEffect = dto.waterRetentionEffect;
    }

    if (dto.drainageEffect !== undefined) {
      fertilizer.drainageEffect = dto.drainageEffect;
    }

    if (dto.recommendedFrequency !== undefined) {
      fertilizer.recommendedFrequency = dto.recommendedFrequency;
    }

    if (dto.dosageGuidance !== undefined) {
      fertilizer.dosageGuidance = dto.dosageGuidance;
    }

    if (dto.notes !== undefined) {
      fertilizer.notes = dto.notes;
    }

    if (dto.isActive !== undefined) {
      fertilizer.isActive = dto.isActive;
    }

    await this.em.flush();
    return fertilizer;
  }

  async remove(id: string) {
    const fertilizer = await this.em.findOne(FertilizerType, { id });
    if (!fertilizer) {
      throw new NotFoundException('Fertilizer type not found');
    }

    await this.em.removeAndFlush(fertilizer);
  }
}
