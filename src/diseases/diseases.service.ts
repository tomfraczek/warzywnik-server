import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Disease } from './disease.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import {
  CreateDiseaseDto,
  ListDiseasesQueryDto,
  UpdateDiseaseDto,
} from './dto/disease.schemas';

@Injectable()
export class DiseasesService {
  constructor(private readonly em: EntityManager) {}

  private normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL');
  }

  async list(query: ListDiseasesQueryDto) {
    const { page, limit, q } = query;

    const where: Record<string, unknown> = {};

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(Disease, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
      populate: ['recommendedActions'],
    });

    return {
      items: items.map((item) => this.serialize(item)),
      page,
      limit,
      total,
    };
  }

  async getById(id: string) {
    const entity = await this.em.findOne(
      Disease,
      { id },
      { populate: ['recommendedActions'] },
    );

    if (!entity) {
      throw new NotFoundException('Disease not found');
    }

    return this.serialize(entity);
  }

  async create(dto: CreateDiseaseDto) {
    const normalizedName = this.normalizeName(dto.name);
    const existing = await this.findByNormalizedName(normalizedName);
    if (existing) {
      throw new ConflictException('Disease name already exists');
    }

    const disease = new Disease();
    disease.name = dto.name.trim().replace(/\s+/g, ' ');
    disease.description = dto.description;
    disease.symptoms = dto.symptoms;
    disease.prevention = dto.prevention;
    disease.treatment = dto.treatment;

    if (dto.recommendedActionTemplateIds !== undefined) {
      const templates = await this.getActionTemplatesOrThrow(
        dto.recommendedActionTemplateIds,
      );
      disease.recommendedActions.set(templates);
    }

    await this.em.persistAndFlush(disease);
    await this.em.populate(disease, ['recommendedActions']);

    return this.serialize(disease);
  }

  async update(id: string, dto: UpdateDiseaseDto) {
    const disease = await this.em.findOne(
      Disease,
      { id },
      { populate: ['recommendedActions'] },
    );
    if (!disease) {
      throw new NotFoundException('Disease not found');
    }

    if (dto.name && dto.name !== disease.name) {
      const existing = await this.findByNormalizedName(
        this.normalizeName(dto.name),
        id,
      );
      if (existing) {
        throw new ConflictException('Disease name already exists');
      }
      disease.name = dto.name.trim().replace(/\s+/g, ' ');
    }

    if (dto.name !== undefined && dto.name === disease.name) {
      disease.name = dto.name.trim().replace(/\s+/g, ' ');
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

    if (dto.recommendedActionTemplateIds !== undefined) {
      const templates = await this.getActionTemplatesOrThrow(
        dto.recommendedActionTemplateIds,
      );
      disease.recommendedActions.set(templates);
    }

    await this.em.flush();

    return this.serialize(disease);
  }

  async remove(id: string) {
    const disease = await this.em.findOne(Disease, { id });
    if (!disease) {
      throw new NotFoundException('Disease not found');
    }

    await this.em.removeAndFlush(disease);
  }

  private async getActionTemplatesOrThrow(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(ids)];
    const templates = await this.em.find(ActionTemplate, {
      id: { $in: uniqueIds },
    });

    if (templates.length !== uniqueIds.length) {
      throw new NotFoundException('One or more action templates not found');
    }

    return templates;
  }

  private async findByNormalizedName(normalizedName: string, excludeId?: string) {
    const diseases = await this.em.find(Disease, excludeId ? { id: { $ne: excludeId } } : {});

    return (
      diseases.find(
        (item) => this.normalizeName(item.name) === normalizedName,
      ) ?? null
    );
  }

  private serialize(entity: Disease) {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      symptoms: entity.symptoms ?? null,
      prevention: entity.prevention ?? null,
      treatment: entity.treatment ?? null,
      recommendedActionTemplateIds: entity.recommendedActions
        .getItems()
        .map((item) => item.id),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
