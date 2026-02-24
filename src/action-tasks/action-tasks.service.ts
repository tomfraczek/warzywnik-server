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
  CreatePlantingActionTasksBulkDto,
  ListActionTasksQueryDto,
  PatchActionTaskDto,
} from './dto/action-task.schemas';
import {
  ActionTaskSource,
  ActionTaskStatus,
  ActionTaskTargetType,
  ActionTemplateTarget,
} from '../common/enums/action.enums';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { RemindersService } from '../reminders/reminders.service';
import { normalizeDueAt } from '../common/types/date-utils';

@Injectable()
export class ActionTasksService {
  constructor(
    private readonly em: EntityManager,
    private readonly remindersService: RemindersService,
  ) {}

  async createForPlanting(
    user: User,
    plantingId: string,
    dto: CreateActionTaskDto,
  ) {
    return this.em.transactional(async (em) => {
      const planting = await this.getPlantingOrThrow(user, plantingId, em);

      const task = new ActionTask();
      task.user = user;
      task.targetType = ActionTaskTargetType.PLANTING;
      task.planting = planting;
      task.bed = null;
      task.source = ActionTaskSource.MANUAL;
      task.sourceRefId = null;
      task.cycleIndex = 0;
      task.originalDueAt = null;
      task.generatedAt = null;
      task.isManuallyRescheduled = false;

      if (dto.actionTemplateId) {
        const template = await em.findOne(ActionTemplate, {
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
          ? this.normalizeTaskDueAt(this.parseDate(dto.dueAt, 'dueAt'))
          : this.resolveTemplateDueAt(new Date(), template.defaultDueOffsetDays);
      } else {
        task.actionTemplate = null;
        task.title = dto.title as string;
        task.description = dto.description ?? null;
        task.dueAt = dto.dueAt
          ? this.normalizeTaskDueAt(this.parseDate(dto.dueAt, 'dueAt'))
          : this.normalizeTaskDueAt(new Date());
      }

      em.persist(task);
      await em.flush();

      await this.remindersService.upsertPendingForActionTask({
        task,
        em,
      });
      await em.flush();

      await em.populate(task, ['actionTemplate', 'planting', 'bed']);

      return this.serialize(task);
    });
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
    return this.em.transactional(async (em) => {
      const bed = await this.getBedOrThrow(user, bedId, em);

      const created = await this.createManualBulk({
        user,
        items: dto.items,
        expectedTarget: ActionTemplateTarget.BED,
        setupTask: (task) => {
          task.targetType = ActionTaskTargetType.BED;
          task.bed = bed;
          task.planting = null;
        },
        em,
      });

      return { items: created.map((item) => this.serialize(item)) };
    });
  }

  async createBulkForPlanting(
    user: User,
    plantingId: string,
    dto: CreatePlantingActionTasksBulkDto,
  ) {
    return this.em.transactional(async (em) => {
      const planting = await this.getPlantingOrThrow(user, plantingId, em);

      const created = await this.createManualBulk({
        user,
        items: dto.items,
        expectedTarget: ActionTemplateTarget.PLANTING,
        setupTask: (task) => {
          task.targetType = ActionTaskTargetType.PLANTING;
          task.bed = null;
          task.planting = planting;
        },
        em,
      });

      return { items: created.map((item) => this.serialize(item)) };
    });
  }

  async patch(user: User, id: string, dto: PatchActionTaskDto) {
    return this.em.transactional(async (em) => {
      const task = await em.findOne(
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
        task.dueAt = dto.dueAt
          ? this.normalizeTaskDueAt(this.parseDate(dto.dueAt, 'dueAt'))
          : this.normalizeTaskDueAt(new Date());
        task.isManuallyRescheduled = true;
      }

      if (dto.title !== undefined) {
        task.title = dto.title;
      }

      if (dto.description !== undefined) {
        task.description = dto.description;
      }

      await em.flush();

      if (
        task.status === ActionTaskStatus.DONE ||
        task.status === ActionTaskStatus.CANCELED
      ) {
        await this.remindersService.cancelPendingForActionTask(task.id, em);
      } else {
        await this.remindersService.upsertPendingForActionTask({ task, em });
      }

      await em.flush();

      return this.serialize(task);
    });
  }

  async remove(user: User, id: string) {
    return this.em.transactional(async (em) => {
      const task = await em.findOne(ActionTask, { id, user: user.id });

      if (!task) {
        throw new NotFoundException('Action task not found');
      }

      await this.remindersService.cancelPendingForActionTask(task.id, em);
      await em.removeAndFlush(task);
    });
  }

  private buildListWhere(user: User, query: ListActionTasksQueryDto) {
    const where: Record<string, unknown> = {
      user: user.id,
    };

    if (query.status === 'pending') {
      where.status = ActionTaskStatus.PENDING;
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

  private async getPlantingOrThrow(
    user: User,
    plantingId: string,
    em: EntityManager = this.em,
  ) {
    const planting = await em.findOne(Planting, {
      id: plantingId,
      user: user.id,
    });

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    return planting;
  }

  private async getBedOrThrow(
    user: User,
    bedId: string,
    em: EntityManager = this.em,
  ) {
    const bed = await em.findOne(Bed, {
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

  private normalizeTaskDueAt(date: Date) {
    return normalizeDueAt(date, 'Europe/Warsaw', 9, 0);
  }

  private resolveTemplateDueAt(
    baseDate: Date,
    defaultDueOffsetDays: number | null,
  ) {
    if (defaultDueOffsetDays === null) {
      return null;
    }

    return this.normalizeTaskDueAt(this.addDays(baseDate, defaultDueOffsetDays));
  }

  private async createManualBulk(params: {
    user: User;
    items: Array<{
      actionTemplateId: string;
      dueAt?: string;
      description?: string | null;
    }>;
    expectedTarget: ActionTemplateTarget;
    setupTask: (task: ActionTask) => void;
    em: EntityManager;
  }) {
    const templateIds = Array.from(
      new Set(params.items.map((item) => item.actionTemplateId)),
    );

    const templates = await params.em.find(ActionTemplate, {
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
    const created: ActionTask[] = params.items.map((item) => {
      const template = templatesById.get(
        item.actionTemplateId,
      ) as ActionTemplate;

      if (template.target !== params.expectedTarget) {
        throw new BadRequestException(
          `Action template ${template.id} target is not compatible with ${params.expectedTarget}`,
        );
      }

      const task = new ActionTask();
      task.user = params.user;
      params.setupTask(task);
      task.actionTemplate = template;
      task.title = template.name;
      task.description =
        item.description !== undefined
          ? item.description
          : (template.description ?? null);
      task.dueAt = item.dueAt
        ? this.normalizeTaskDueAt(this.parseDate(item.dueAt, 'dueAt'))
        : this.resolveTemplateDueAt(now, template.defaultDueOffsetDays);
      task.status = ActionTaskStatus.PENDING;
      task.source = ActionTaskSource.MANUAL;
      task.sourceRefId = null;
      task.cycleIndex = 0;
      task.originalDueAt = null;
      task.generatedAt = null;
      task.isManuallyRescheduled = false;

      return task;
    });

    params.em.persist(created);
    await params.em.flush();

    for (const task of created) {
      await this.remindersService.upsertPendingForActionTask({
        task,
        em: params.em,
      });
    }

    await params.em.flush();
    await params.em.populate(created, ['actionTemplate', 'planting', 'bed']);

    return created;
  }

  private serialize(entity: ActionTask) {
    return {
      id: entity.id,
      userId: entity.user.id,
      targetType: entity.targetType,
      plantingId: entity.planting?.id ?? null,
      bedId: entity.bed?.id ?? null,
      status: entity.status,
      source: entity.source,
      sourceRefId: entity.sourceRefId ?? null,
      cycleIndex: entity.cycleIndex,
      originalDueAt: entity.originalDueAt ?? null,
      isManuallyRescheduled: entity.isManuallyRescheduled,
      generatedAt: entity.generatedAt ?? null,
      dueAt: entity.dueAt,
      title: entity.title,
      description: entity.description ?? null,
      actionTemplate: entity.actionTemplate
        ? {
            id: entity.actionTemplate.id,
            name: entity.actionTemplate.name,
            scope: entity.actionTemplate.target,
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
