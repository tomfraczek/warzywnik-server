import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Pest } from './pest.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import {
  CreatePestDto,
  ListPestsQueryDto,
  UpdatePestDto,
} from './dto/pest.schemas';

@Injectable()
export class PestsService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListPestsQueryDto) {
    const { page, limit, q } = query;

    const where: Record<string, unknown> = {};

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(Pest, where, {
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
      Pest,
      { id },
      { populate: ['recommendedActions'] },
    );

    if (!entity) {
      throw new NotFoundException('Pest not found');
    }

    return this.serialize(entity);
  }

  async create(dto: CreatePestDto) {
    const existing = await this.em.findOne(Pest, {
      name: { $ilike: dto.name },
    });
    if (existing) {
      throw new ConflictException('Pest name already exists');
    }

    const pest = new Pest();
    pest.name = dto.name;
    pest.description = dto.description;
    pest.symptoms = dto.symptoms ?? null;
    pest.prevention = dto.prevention ?? null;
    pest.treatment = dto.treatment ?? null;

    if (dto.recommendedActionTemplateIds !== undefined) {
      const templates = await this.getActionTemplatesOrThrow(
        dto.recommendedActionTemplateIds,
      );
      pest.recommendedActions.set(templates);
    }

    await this.em.persistAndFlush(pest);
    await this.em.populate(pest, ['recommendedActions']);

    return this.serialize(pest);
  }

  async update(id: string, dto: UpdatePestDto) {
    const pest = await this.em.findOne(
      Pest,
      { id },
      { populate: ['recommendedActions'] },
    );
    if (!pest) {
      throw new NotFoundException('Pest not found');
    }

    if (dto.name && dto.name !== pest.name) {
      const existing = await this.em.findOne(Pest, {
        id: { $ne: id },
        name: { $ilike: dto.name },
      });
      if (existing) {
        throw new ConflictException('Pest name already exists');
      }
      pest.name = dto.name;
    }

    if (dto.name !== undefined && dto.name === pest.name) {
      pest.name = dto.name;
    }

    if (dto.description !== undefined) {
      pest.description = dto.description;
    }

    if (dto.symptoms !== undefined) {
      pest.symptoms = dto.symptoms;
    }

    if (dto.prevention !== undefined) {
      pest.prevention = dto.prevention;
    }

    if (dto.treatment !== undefined) {
      pest.treatment = dto.treatment;
    }

    if (dto.recommendedActionTemplateIds !== undefined) {
      const templates = await this.getActionTemplatesOrThrow(
        dto.recommendedActionTemplateIds,
      );
      pest.recommendedActions.set(templates);
    }

    await this.em.flush();

    return this.serialize(pest);
  }

  async remove(id: string) {
    const pest = await this.em.findOne(Pest, { id });
    if (!pest) {
      throw new NotFoundException('Pest not found');
    }

    await this.em.removeAndFlush(pest);
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

  private serialize(entity: Pest) {
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
