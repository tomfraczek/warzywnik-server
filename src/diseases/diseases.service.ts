import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Disease } from './disease.entity';
import {
  CreateDiseaseDto,
  ListDiseasesQueryDto,
  UpdateDiseaseDto,
} from './dto/disease.schemas';

@Injectable()
export class DiseasesService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListDiseasesQueryDto) {
    const { page, limit, q } = query;

    const where: Record<string, unknown> = {};

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { slug: { $ilike: `%${q}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(Disease, where, {
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
    const entity = await this.em.findOne(Disease, { id });

    if (!entity) {
      throw new NotFoundException('Disease not found');
    }

    return entity;
  }

  async create(dto: CreateDiseaseDto) {
    const existing = await this.em.findOne(Disease, { slug: dto.slug });
    if (existing) {
      throw new ConflictException('Disease slug already exists');
    }

    const disease = new Disease();
    disease.slug = dto.slug;
    disease.name = dto.name;
    disease.description = dto.description;
    disease.symptoms = dto.symptoms ?? null;
    disease.prevention = dto.prevention ?? null;
    disease.treatment = dto.treatment ?? null;

    await this.em.persistAndFlush(disease);
    return disease;
  }

  async update(id: string, dto: UpdateDiseaseDto) {
    const disease = await this.em.findOne(Disease, { id });
    if (!disease) {
      throw new NotFoundException('Disease not found');
    }

    if (dto.slug && dto.slug !== disease.slug) {
      const existing = await this.em.findOne(Disease, { slug: dto.slug });
      if (existing) {
        throw new ConflictException('Disease slug already exists');
      }
      disease.slug = dto.slug;
    }

    if (dto.name !== undefined) {
      disease.name = dto.name;
    }

    if (dto.description !== undefined) {
      disease.description = dto.description;
    }

    if (dto.symptoms !== undefined) {
      disease.symptoms = dto.symptoms;
    }

    if (dto.prevention !== undefined) {
      disease.prevention = dto.prevention;
    }

    if (dto.treatment !== undefined) {
      disease.treatment = dto.treatment;
    }

    await this.em.flush();
    return disease;
  }

  async remove(id: string) {
    const disease = await this.em.findOne(Disease, { id });
    if (!disease) {
      throw new NotFoundException('Disease not found');
    }

    await this.em.removeAndFlush(disease);
  }
}
