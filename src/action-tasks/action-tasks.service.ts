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
  ActionTaskSourceType,
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
import { PlantingInsightsService } from '../planting-insights/planting-insights.service';
import { PlantingEventType } from '../common/enums/planting-event.enums';

@Injectable()
export class ActionTasksService {
  constructor(
    private readonly em: EntityManager,
    private readonly remindersService: RemindersService,
    private readonly plantingInsightsService: PlantingInsightsService,
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
      task.sourceType = ActionTaskSourceType.MANUAL;
      task.sourceRefId = null;
      task.sourceKey = null;
      task.cycleIndex = 0;
      task.originalDueAt = null;
      task.generatedAt = null;
      task.isManuallyRescheduled = false;
      task.isUserModified = false;
      task.suppressedAt = null;

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
          : this.resolveTemplateDueAt(
              new Date(),
              template.defaultDueOffsetDays,
            );
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
    type ActionEventParams = {
      plantingId: string;
      userId: string;
      bedId: string;
      vegetableId: string;
      taskId: string;
      actionType: string | null;
      decisionType: string | null;
      actionKind: string | null;
      actionTitle: string;
      source: ActionTaskSource;
      doneAt: Date;
    };

    type ActionRescheduledEventParams = {
      plantingId: string;
      userId: string;
      bedId: string;
      vegetableId: string;
      taskId: string;
      actionType: string | null;
      decisionType: string | null;
      actionKind: string | null;
      actionTitle: string;
      source: ActionTaskSource;
      previousDueAt: Date | null;
      nextDueAt: Date | null;
      changedAt: Date;
    };

    let actionEventParams: ActionEventParams | null = null;
    let actionRescheduledEventParams: ActionRescheduledEventParams | null =
      null;

    const result = await this.em.transactional(async (em) => {
      const task = await em.findOne(
        ActionTask,
        { id, user: user.id },
        { populate: ['actionTemplate', 'planting', 'bed'] },
      );

      if (!task) {
        throw new NotFoundException('Action task not found');
      }

      const previousDueAt = task.dueAt ? new Date(task.dueAt) : null;

      if (dto.status !== undefined) {
        task.status = dto.status;
        task.doneAt = dto.status === ActionTaskStatus.DONE ? new Date() : null;
        if (task.source !== ActionTaskSource.MANUAL) {
          task.isUserModified = true;
        }
      }

      if (dto.dueAt !== undefined) {
        task.dueAt = dto.dueAt
          ? this.normalizeTaskDueAt(this.parseDate(dto.dueAt, 'dueAt'))
          : this.normalizeTaskDueAt(new Date());
        task.isManuallyRescheduled = true;
        if (task.source !== ActionTaskSource.MANUAL) {
          task.isUserModified = true;
        }
      }

      if (dto.title !== undefined) {
        task.title = dto.title;
        if (task.source !== ActionTaskSource.MANUAL) {
          task.isUserModified = true;
        }
      }

      if (dto.description !== undefined) {
        task.description = dto.description;
        if (task.source !== ActionTaskSource.MANUAL) {
          task.isUserModified = true;
        }
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

      // Capture event params for PLANTING_ACTION_RESCHEDULED before transaction ends
      if (
        dto.dueAt !== undefined &&
        task.targetType === ActionTaskTargetType.PLANTING &&
        task.planting != null
      ) {
        await em.populate(task.planting, ['bed', 'vegetable']);

        const nextDueAt = task.dueAt ? new Date(task.dueAt) : null;
        const hasChangedDueAt =
          previousDueAt?.getTime() !== nextDueAt?.getTime() ||
          (previousDueAt == null) !== (nextDueAt == null);

        if (hasChangedDueAt) {
          actionRescheduledEventParams = {
            plantingId: task.planting.id,
            userId: user.id,
            bedId: task.planting.bed.id,
            vegetableId: task.planting.vegetable.id,
            taskId: task.id,
            actionType: task.actionTemplate?.type ?? null,
            decisionType:
              typeof task.metadata?.decisionType === 'string'
                ? task.metadata.decisionType
                : null,
            actionKind:
              typeof task.metadata?.actionKind === 'string'
                ? task.metadata.actionKind
                : null,
            actionTitle: task.title,
            source: task.source,
            previousDueAt,
            nextDueAt,
            changedAt: new Date(),
          };
        }
      }

      // Capture event params for PLANTING_ACTION_COMPLETED before transaction ends
      if (
        task.status === ActionTaskStatus.DONE &&
        task.targetType === ActionTaskTargetType.PLANTING &&
        task.planting != null &&
        task.actionTemplate != null &&
        task.doneAt != null
      ) {
        await em.populate(task.planting, ['bed', 'vegetable']);
        actionEventParams = {
          plantingId: task.planting.id,
          userId: user.id,
          bedId: task.planting.bed.id,
          vegetableId: task.planting.vegetable.id,
          taskId: task.id,
          actionType: task.actionTemplate.type,
          decisionType:
            typeof task.metadata?.decisionType === 'string'
              ? task.metadata.decisionType
              : null,
          actionKind:
            typeof task.metadata?.actionKind === 'string'
              ? task.metadata.actionKind
              : null,
          actionTitle: task.title,
          source: task.source,
          doneAt: task.doneAt,
        };
      }

      await em.flush();

      return this.serialize(task);
    });

    if (actionEventParams) {
      const p = actionEventParams as ActionEventParams;
      await this.plantingInsightsService.recordEvent({
        plantingId: p.plantingId,
        userId: p.userId,
        bedId: p.bedId,
        vegetableId: p.vegetableId,
        eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
        eventTime: p.doneAt,
        payload: {
          taskId: p.taskId,
          actionType: p.actionType,
          decisionType: p.decisionType,
          actionKind: p.actionKind,
          actionTitle: p.actionTitle,
          source: p.source,
        },
      });
    }

    if (actionRescheduledEventParams) {
      const p = actionRescheduledEventParams as ActionRescheduledEventParams;
      await this.plantingInsightsService.recordEvent({
        plantingId: p.plantingId,
        userId: p.userId,
        bedId: p.bedId,
        vegetableId: p.vegetableId,
        eventType: PlantingEventType.PLANTING_ACTION_RESCHEDULED,
        eventTime: p.changedAt,
        payload: {
          taskId: p.taskId,
          actionType: p.actionType,
          decisionType: p.decisionType,
          actionKind: p.actionKind,
          actionTitle: p.actionTitle,
          source: p.source,
          previousDueAt: p.previousDueAt?.toISOString() ?? null,
          nextDueAt: p.nextDueAt?.toISOString() ?? null,
        },
      });
    }

    return result;
  }

  async remove(user: User, id: string) {
    return this.em.transactional(async (em) => {
      const task = await em.findOne(ActionTask, { id, user: user.id });

      if (!task) {
        throw new NotFoundException('Action task not found');
      }

      await this.remindersService.cancelPendingForActionTask(task.id, em);

      if (task.source === ActionTaskSource.MANUAL) {
        await em.removeAndFlush(task);
        return;
      }

      task.status = ActionTaskStatus.CANCELED;
      task.suppressedAt = new Date();
      task.isUserModified = true;
      await em.flush();
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

    return this.normalizeTaskDueAt(
      this.addDays(baseDate, defaultDueOffsetDays),
    );
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
      task.sourceType = ActionTaskSourceType.MANUAL;
      task.sourceRefId = null;
      task.sourceKey = null;
      task.cycleIndex = 0;
      task.originalDueAt = null;
      task.generatedAt = null;
      task.isManuallyRescheduled = false;
      task.isUserModified = false;
      task.suppressedAt = null;

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
      sourceType: entity.sourceType,
      sourceRefId: entity.sourceRefId ?? null,
      sourceKey: entity.sourceKey ?? null,
      cycleIndex: entity.cycleIndex,
      originalDueAt: entity.originalDueAt ?? null,
      isManuallyRescheduled: entity.isManuallyRescheduled,
      isUserModified: entity.isUserModified,
      suppressedAt: entity.suppressedAt ?? null,
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
