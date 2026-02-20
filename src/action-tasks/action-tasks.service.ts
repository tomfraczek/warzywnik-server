import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTask } from './action-task.entity';
import {
  CreateBedActionTasksBulkDto,
  CreateActionTaskDto,
  ListActionTasksQueryDto,
  PatchActionTaskDto,
} from './dto/action-task.schemas';
import {
  ActionTaskStatus,
  ActionTaskTargetType,
  ActionTemplateTarget,
} from '../common/enums/action.enums';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';

@Injectable()
export class ActionTasksService {
  constructor(private readonly em: EntityManager) {}

  async createForPlanting(
    user: User,
    plantingId: string,
    dto: CreateActionTaskDto,
  ) {
    const planting = await this.getPlantingOrThrow(user, plantingId);

    const task = new ActionTask();
    task.user = user;
    task.targetType = ActionTaskTargetType.PLANTING;
    task.planting = planting;
    task.bed = null;

    if (dto.actionTemplateId) {
      const template = await this.em.findOne(ActionTemplate, {
        id: dto.actionTemplateId,
      });

      if (!template) {
        throw new NotFoundException('Action template not found');
      }

      if (template.target !== ActionTemplateTarget.PLANTING) {
        throw new BadRequestException(
          'Action template target is not compatible with planting',
        );
      }

      task.actionTemplate = template;
      task.title = template.name;
      task.description =
        dto.description !== undefined
          ? dto.description
          : (template.description ?? null);
      task.dueAt = dto.dueAt
        ? this.parseDate(dto.dueAt, 'dueAt')
        : this.addDays(new Date(), template.defaultDueOffsetDays);
    } else {
      task.actionTemplate = null;
      task.title = dto.title as string;
      task.description = dto.description ?? null;
      task.dueAt = dto.dueAt ? this.parseDate(dto.dueAt, 'dueAt') : null;
    }

    await this.em.persistAndFlush(task);

    await this.em.populate(task, ['actionTemplate', 'planting', 'bed']);

    return this.serialize(task);
  }

  async listForPlanting(
    user: User,
    plantingId: string,
    query: ListActionTasksQueryDto,
  ) {
    await this.getPlantingOrThrow(user, plantingId);

    const where = this.buildListWhere(user, query);
    where.planting = plantingId;

    const items = await this.em.find(ActionTask, where, {
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      populate: ['actionTemplate', 'planting', 'bed'],
    });

    return items.map((item) => this.serialize(item));
  }

  async listForBed(user: User, bedId: string, query: ListActionTasksQueryDto) {
    await this.getBedOrThrow(user, bedId);

    const where = this.buildListWhere(user, query);
    where.$or = [{ bed: bedId }, { planting: { bed: bedId } }];

    const items = await this.em.find(ActionTask, where, {
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      populate: ['actionTemplate', 'planting', 'bed'],
    });

    return items.map((item) => this.serialize(item));
  }

  async createBulkForBed(
    user: User,
    bedId: string,
    dto: CreateBedActionTasksBulkDto,
  ) {
    const bed = await this.getBedOrThrow(user, bedId);

    const templateIds = Array.from(
      new Set(dto.items.map((item) => item.actionTemplateId)),
    );

    const templates = await this.em.find(ActionTemplate, {
      id: { $in: templateIds },
    });

    const templatesById = new Map(templates.map((item) => [item.id, item]));

    const missingTemplateIds = templateIds.filter(
      (id) => !templatesById.has(id),
    );

    if (missingTemplateIds.length > 0) {
      throw new NotFoundException(
        `Action template not found: ${missingTemplateIds.join(', ')}`,
      );
    }

    const now = new Date();

    const created: ActionTask[] = dto.items.map((item) => {
      const template = templatesById.get(item.actionTemplateId) as ActionTemplate;

      if (template.target !== ActionTemplateTarget.BED) {
        throw new BadRequestException(
          `Action template ${template.id} target is not compatible with bed`,
        );
      }

      const task = new ActionTask();
      task.user = user;
      task.targetType = ActionTaskTargetType.BED;
      task.bed = bed;
      task.planting = null;
      task.actionTemplate = template;
      task.title = template.name;
      task.description =
        item.description !== undefined
          ? item.description
          : (template.description ?? null);
      task.dueAt = item.dueAt
        ? this.parseDate(item.dueAt, 'dueAt')
        : this.addDays(now, template.defaultDueOffsetDays);

      return task;
    });

    await this.em.persistAndFlush(created);
    await this.em.populate(created, ['actionTemplate', 'planting', 'bed']);

    return {
      items: created.map((item) => this.serialize(item)),
    };
  }

  async patch(user: User, id: string, dto: PatchActionTaskDto) {
    const task = await this.em.findOne(
      ActionTask,
      { id, user: user.id },
      { populate: ['actionTemplate', 'planting', 'bed'] },
    );

    if (!task) {
      throw new NotFoundException('Action task not found');
    }

    if (dto.status !== undefined) {
      task.status = dto.status;
      task.doneAt = dto.status === ActionTaskStatus.DONE ? new Date() : null;
    }

    if (dto.dueAt !== undefined) {
      task.dueAt = dto.dueAt ? this.parseDate(dto.dueAt, 'dueAt') : null;
    }

    if (dto.title !== undefined) {
      task.title = dto.title;
    }

    if (dto.description !== undefined) {
      task.description = dto.description;
    }

    await this.em.flush();

    return this.serialize(task);
  }

  async remove(user: User, id: string) {
    const task = await this.em.findOne(ActionTask, { id, user: user.id });

    if (!task) {
      throw new NotFoundException('Action task not found');
    }

    await this.em.removeAndFlush(task);
  }

  private buildListWhere(user: User, query: ListActionTasksQueryDto) {
    const where: Record<string, unknown> = {
      user: user.id,
    };

    if (query.status === 'planned') {
      where.status = ActionTaskStatus.PLANNED;
    } else if (query.status === 'done') {
      where.status = ActionTaskStatus.DONE;
    }

    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) {
        range.$gte = this.parseDate(query.from, 'from');
      }
      if (query.to) {
        range.$lte = this.parseDate(query.to, 'to');
      }
      where.dueAt = range;
    }

    return where;
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

  private async getBedOrThrow(user: User, bedId: string) {
    const bed = await this.em.findOne(Bed, {
      id: bedId,
      user: user.id,
    });

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    return bed;
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }
    return date;
  }

  private addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private serialize(entity: ActionTask) {
    return {
      id: entity.id,
      userId: entity.user.id,
      targetType: entity.targetType,
      plantingId: entity.planting?.id ?? null,
      bedId: entity.bed?.id ?? null,
      status: entity.status,
      dueAt: entity.dueAt ?? null,
      title: entity.title,
      description: entity.description ?? null,
      actionTemplate: entity.actionTemplate
        ? {
            id: entity.actionTemplate.id,
            slug: entity.actionTemplate.slug,
            name: entity.actionTemplate.name,
            target: entity.actionTemplate.target,
            type: entity.actionTemplate.type,
            defaultDueOffsetDays: entity.actionTemplate.defaultDueOffsetDays,
          }
        : null,
      doneAt: entity.doneAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
