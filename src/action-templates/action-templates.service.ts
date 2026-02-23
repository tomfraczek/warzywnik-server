import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTemplate } from './action-template.entity';
import {
  CreateActionTemplateDto,
  ListActionTemplatesQueryDto,
  UpdateActionTemplateDto,
} from './dto/action-template.schemas';

@Injectable()
export class ActionTemplatesService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListActionTemplatesQueryDto) {
    const { page, limit, q } = query;

    const where: Record<string, unknown> = {};

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(ActionTemplate, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
    });

    return {
      items: items.map((item) => this.serialize(item)),
      page,
      limit,
      total,
    };
  }

  async getById(id: string) {
    const entity = await this.em.findOne(ActionTemplate, { id });

    if (!entity) {
      throw new NotFoundException('Action template not found');
    }

    return this.serialize(entity);
  }

  async create(dto: CreateActionTemplateDto) {
    const existing = await this.em.findOne(ActionTemplate, {
      name: { $ilike: dto.name },
    });
    if (existing) {
      throw new ConflictException('Action template name already exists');
    }

    const template = new ActionTemplate();
    template.name = dto.name;
    template.description = dto.description ?? null;
    template.target = dto.target;
    template.type = dto.type;
    template.defaultDueOffsetDays = dto.defaultDueOffsetDays ?? 0;

    await this.em.persistAndFlush(template);
    return this.serialize(template);
  }

  async update(id: string, dto: UpdateActionTemplateDto) {
    const template = await this.em.findOne(ActionTemplate, { id });
    if (!template) {
      throw new NotFoundException('Action template not found');
    }

    if (dto.name && dto.name !== template.name) {
      const existing = await this.em.findOne(ActionTemplate, {
        id: { $ne: id },
        name: { $ilike: dto.name },
      });
      if (existing) {
        throw new ConflictException('Action template name already exists');
      }
      template.name = dto.name;
    }

    if (dto.name !== undefined && dto.name === template.name) {
      template.name = dto.name;
    }

    if (dto.description !== undefined) {
      template.description = dto.description;
    }

    if (dto.target !== undefined) {
      template.target = dto.target;
    }

    if (dto.type !== undefined) {
      template.type = dto.type;
    }

    if (dto.defaultDueOffsetDays !== undefined) {
      template.defaultDueOffsetDays = dto.defaultDueOffsetDays;
    }

    await this.em.flush();
    return this.serialize(template);
  }

  async remove(id: string) {
    const template = await this.em.findOne(ActionTemplate, { id });
    if (!template) {
      throw new NotFoundException('Action template not found');
    }

    await this.em.removeAndFlush(template);
  }

  private serialize(entity: ActionTemplate) {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      scope: entity.target,
      target: entity.target,
      type: entity.type,
      defaultDueOffsetDays: entity.defaultDueOffsetDays,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
