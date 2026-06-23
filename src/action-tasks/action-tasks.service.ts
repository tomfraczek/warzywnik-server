import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTask } from './action-task.entity';
import {
  CreateBedActionTasksBulkDto,
  CreateManualActionTaskDto,
  CreatePlantingActionTasksBulkDto,
  ListBedActionTasksQueryDto,
  ListActionTasksQueryDto,
  ListPlantingActionTasksQueryDto,
  PatchActionTaskDto,
} from './dto/action-task.schemas';
import {
  ActionTaskOwnerScopeType,
  ActionTaskSource,
  ActionTaskSourceType,
  ActionTaskStatus,
  ActionTaskTargetType,
  ActionTemplateTarget,
  BedActionTasksScope,
} from '../common/enums/action.enums';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { RemindersService } from '../reminders/reminders.service';
import { normalizeDueAt } from '../common/types/date-utils';
import { PlantingInsightsService } from '../planting-insights/planting-insights.service';
import { PlantingEventType } from '../common/enums/planting-event.enums';
import { NotificationEventService } from '../notifications/notification-event.service';

@Injectable()
export class ActionTasksService {
  private readonly logger = new Logger(ActionTasksService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly remindersService: RemindersService,
    private readonly plantingInsightsService: PlantingInsightsService,
    private readonly notificationEventService: NotificationEventService,
  ) {}

  @Cron('15 0 * * *', { name: 'action-tasks-cleanup-overdue-next-day' })
  async cleanupOverdueTasksNextDay(): Promise<void> {
    try {
      const cutoff = this.startOfUtcDay(new Date());

      const staleTasks = await this.em.find(
        ActionTask,
        {
          status: ActionTaskStatus.PENDING,
          source: ActionTaskSource.VEGETABLE_RULE,
          sourceType: ActionTaskSourceType.AUTOMATION,
          dueAt: { $lt: cutoff },
        },
        {
          orderBy: [{ dueAt: 'asc' }],
          limit: 2000,
        },
      );

      if (staleTasks.length === 0) {
        return;
      }

      await this.em.transactional(async (em) => {
        for (const task of staleTasks) {
          task.status = ActionTaskStatus.CANCELED;
          task.suppressedAt = new Date();
          await this.remindersService.cancelPendingForActionTask(task.id, em);
        }

        await em.flush();
      });

      this.logger.log(
        `overdue automation tasks canceled count=${staleTasks.length} cutoff=${cutoff.toISOString()}`,
      );
    } finally {
      this.em.clear();
    }
  }

  @Cron('25 0 * * *', { name: 'action-tasks-cleanup-done-next-day' })
  async cleanupDoneTasksNextDay(): Promise<void> {
    try {
      const cutoff = this.startOfUtcDay(this.addDays(new Date(), -1));

      const doneTasks = await this.em.find(
        ActionTask,
        {
          status: ActionTaskStatus.DONE,
          $or: [
            { doneAt: { $lt: cutoff } },
            { doneAt: null, updatedAt: { $lt: cutoff } },
          ],
        },
        {
          orderBy: [{ doneAt: 'asc' }, { updatedAt: 'asc' }],
          limit: 2000,
        },
      );

      if (doneTasks.length === 0) {
        return;
      }

      await this.em.transactional(async (em) => {
        for (const task of doneTasks) {
          await this.remindersService.cancelPendingForActionTask(task.id, em);
          em.remove(task);
        }

        await em.flush();
      });

      this.logger.log(
        `done tasks removed count=${doneTasks.length} cutoff=${cutoff.toISOString()}`,
      );
    } finally {
      this.em.clear();
    }
  }

  async createForPlanting(
    user: User,
    plantingId: string,
    dto: CreateManualActionTaskDto,
  ) {
    return this.em.transactional(async (em) => {
      const planting = await this.getPlantingOrThrow(user, plantingId, em);

      const template = await this.getManualTemplateOrThrow(
        dto.actionTemplateId,
        ActionTemplateTarget.PLANTING,
        em,
      );

      const task = new ActionTask();
      task.user = user;
      task.targetType = ActionTaskTargetType.PLANTING;
      task.ownerScopeType = ActionTaskOwnerScopeType.PLANTING;
      task.ownerScopeId = planting.id;
      task.planting = planting;
      task.bed = planting.bed;
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

      task.actionTemplate = template;
      task.title = template.name;
      task.description =
        dto.description !== undefined
          ? dto.description
          : (template.description ?? null);
      task.dueAt = this.normalizeTaskDueAt(this.parseDate(dto.dueAt, 'dueAt'));
      task.metadata = {
        ...(task.metadata ?? {}),
        manual: true,
        targetType: ActionTaskTargetType.PLANTING,
        actionTemplateId: template.id,
      };

      em.persist(task);
      await em.flush();

      await this.remindersService.upsertPendingForActionTask({
        task,
        em,
      });
      await em.flush();

      await em.populate(task, [
        'actionTemplate',
        'planting',
        'planting.vegetable',
        'bed',
      ]);

      await this.notificationEventService.publishTaskEvents({
        userId: user.id,
        tasks: [task],
        source: 'action-tasks.manual',
      });

      return this.serialize(task);
    });
  }

  async createForBed(
    user: User,
    bedId: string,
    dto: CreateManualActionTaskDto,
  ) {
    return this.em.transactional(async (em) => {
      const bed = await this.getBedOrThrow(user, bedId, em);
      const template = await this.getManualTemplateOrThrow(
        dto.actionTemplateId,
        ActionTemplateTarget.BED,
        em,
      );

      const task = new ActionTask();
      task.user = user;
      task.targetType = ActionTaskTargetType.BED;
      task.ownerScopeType = ActionTaskOwnerScopeType.BED;
      task.ownerScopeId = bed.id;
      task.bed = bed;
      task.planting = null;
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
      task.actionTemplate = template;
      task.title = template.name;
      task.description =
        dto.description !== undefined
          ? dto.description
          : (template.description ?? null);
      task.dueAt = this.normalizeTaskDueAt(this.parseDate(dto.dueAt, 'dueAt'));
      task.metadata = {
        ...(task.metadata ?? {}),
        manual: true,
        targetType: ActionTaskTargetType.BED,
        actionTemplateId: template.id,
      };

      em.persist(task);
      await em.flush();

      await this.remindersService.upsertPendingForActionTask({ task, em });
      await em.flush();

      await em.populate(task, [
        'actionTemplate',
        'planting',
        'planting.vegetable',
        'bed',
      ]);

      await this.notificationEventService.publishTaskEvents({
        userId: user.id,
        tasks: [task],
        source: 'action-tasks.manual',
      });

      return this.serialize(task);
    });
  }

  async listForPlanting(
    user: User,
    plantingId: string,
    query: ListPlantingActionTasksQueryDto,
  ) {
    await this.getPlantingOrThrow(user, plantingId);

    const baseWhere = this.buildListWhere(user, query);
    const mode = query.mode ?? 'direct';

    if (mode === 'direct') {
      // Only tasks directly owned by this planting
      const where = {
        ...baseWhere,
        ownerScopeType: ActionTaskOwnerScopeType.PLANTING,
        ownerScopeId: plantingId,
      };
      const items = await this.em.find(ActionTask, where, {
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        populate: ['actionTemplate', 'planting', 'planting.vegetable', 'bed'],
      });
      return items.map((item) =>
        this.serialize(item, { relationToCurrentPlanting: 'direct' }),
      );
    }

    if (mode === 'related') {
      // Bed/space tasks that have this planting in affectedPlantingIds
      const items = await this.em.find(
        ActionTask,
        {
          ...baseWhere,
          ownerScopeType: {
            $in: [ActionTaskOwnerScopeType.BED, ActionTaskOwnerScopeType.SPACE],
          },
          metadata: { affectedPlantingIds: { $contains: [plantingId] } as any },
        },
        {
          orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
          populate: ['actionTemplate', 'planting', 'planting.vegetable', 'bed'],
        },
      );
      return items.map((item) =>
        this.serialize(item, {
          relationToCurrentPlanting:
            item.ownerScopeType === ActionTaskOwnerScopeType.BED
              ? 'related_from_bed'
              : 'related_from_space',
        }),
      );
    }

    // mode === 'all'
    const directItems = await this.em.find(
      ActionTask,
      {
        ...baseWhere,
        ownerScopeType: ActionTaskOwnerScopeType.PLANTING,
        ownerScopeId: plantingId,
      },
      {
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        populate: ['actionTemplate', 'planting', 'planting.vegetable', 'bed'],
      },
    );

    const relatedItems = await this.em.find(
      ActionTask,
      {
        ...baseWhere,
        ownerScopeType: {
          $in: [ActionTaskOwnerScopeType.BED, ActionTaskOwnerScopeType.SPACE],
        },
        metadata: { affectedPlantingIds: { $contains: [plantingId] } as any },
      },
      {
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        populate: ['actionTemplate', 'planting', 'planting.vegetable', 'bed'],
      },
    );

    const all = [
      ...directItems.map((item) =>
        this.serialize(item, { relationToCurrentPlanting: 'direct' }),
      ),
      ...relatedItems.map((item) =>
        this.serialize(item, {
          relationToCurrentPlanting:
            item.ownerScopeType === ActionTaskOwnerScopeType.BED
              ? 'related_from_bed'
              : 'related_from_space',
        }),
      ),
    ];
    all.sort((a, b) => {
      const aTime = a.dueAt ? new Date(a.dueAt).getTime() : 0;
      const bTime = b.dueAt ? new Date(b.dueAt).getTime() : 0;
      return aTime - bTime;
    });
    return all;
  }

  async listForBed(
    user: User,
    bedId: string,
    query: ListBedActionTasksQueryDto,
  ) {
    await this.getBedOrThrow(user, bedId);

    const where = this.buildListWhere(user, query);
    const scope = query.scope ?? BedActionTasksScope.INCLUDING_CHILDREN;

    if (scope === BedActionTasksScope.OWN) {
      where.ownerScopeType = ActionTaskOwnerScopeType.BED;
      where.ownerScopeId = bedId;
    } else {
      where.$or = [{ bed: bedId }, { planting: { bed: bedId } }];
    }

    const items = await this.em.find(ActionTask, where, {
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      populate: ['actionTemplate', 'planting', 'planting.vegetable', 'bed'],
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
          task.ownerScopeType = ActionTaskOwnerScopeType.BED;
          task.ownerScopeId = bed.id;
          task.bed = bed;
          task.planting = null;
        },
        em,
      });

      await this.notificationEventService.publishTaskEvents({
        userId: user.id,
        tasks: created,
        source: 'action-tasks.manual.bulk',
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
          task.ownerScopeType = ActionTaskOwnerScopeType.PLANTING;
          task.ownerScopeId = planting.id;
          task.bed = null;
          task.planting = planting;
        },
        em,
      });

      await this.notificationEventService.publishTaskEvents({
        userId: user.id,
        tasks: created,
        source: 'action-tasks.manual.bulk',
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
      actionTemplateId: string | null;
      actionType: string | null;
      decisionType: string | null;
      actionKind: string | null;
      actionTitle: string;
      source: ActionTaskSource;
      targetType: ActionTaskTargetType;
      dueAt: string | null;
      description: string | null;
      doneAt: Date;
    };

    type ActionRescheduledEventParams = {
      plantingId: string;
      userId: string;
      bedId: string;
      vegetableId: string;
      taskId: string;
      actionTemplateId: string | null;
      actionType: string | null;
      decisionType: string | null;
      actionKind: string | null;
      actionTitle: string;
      source: ActionTaskSource;
      targetType: ActionTaskTargetType;
      dueAt: string | null;
      description: string | null;
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
        {
          populate: ['actionTemplate', 'planting', 'planting.vegetable', 'bed'],
        },
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
            actionTemplateId: task.actionTemplate?.id ?? null,
            targetType: task.targetType,
            dueAt: task.dueAt?.toISOString() ?? null,
            description: task.description ?? null,
            previousDueAt,
            nextDueAt,
            changedAt: new Date(),
          };
        }
      }

      // Capture event params for PLANTING_ACTION_COMPLETED before transaction ends
      if (
        task.status === ActionTaskStatus.DONE &&
        (task.targetType === ActionTaskTargetType.PLANTING ||
          task.ownerScopeType === ActionTaskOwnerScopeType.PLANTING) &&
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
          actionTemplateId: task.actionTemplate.id,
          targetType: task.targetType,
          dueAt: task.dueAt?.toISOString() ?? null,
          description: task.description ?? null,
          doneAt: task.doneAt,
        };
      }

      if (
        task.status === ActionTaskStatus.DONE &&
        (task.targetType === ActionTaskTargetType.BED ||
          task.ownerScopeType === ActionTaskOwnerScopeType.BED) &&
        task.bed != null &&
        task.actionTemplate != null &&
        task.doneAt != null
      ) {
        const TERMINAL_STATUSES = new Set([
          'FAILED',
          'CANCELLED',
          'HARVESTED',
          'CLEARED',
          'failed',
          'cancelled',
          'harvested',
          'cleared',
        ]);

        // Prefer explicit affectedPlantingIds; fall back to all active plantings in bed
        const affectedIds = Array.isArray(task.metadata?.affectedPlantingIds)
          ? (task.metadata.affectedPlantingIds as string[])
          : null;

        const bedPlantings = await em.find(
          Planting,
          {
            user: user.id,
            bed: task.bed.id,
          },
          { populate: ['bed', 'vegetable'] },
        );

        const plantingsToRecord = affectedIds
          ? bedPlantings.filter(
              (p) =>
                affectedIds.includes(p.id) && !TERMINAL_STATUSES.has(p.status),
            )
          : bedPlantings.filter((p) => !TERMINAL_STATUSES.has(p.status));

        for (const planting of plantingsToRecord) {
          await this.plantingInsightsService.recordEvent({
            plantingId: planting.id,
            userId: user.id,
            bedId: planting.bed.id,
            vegetableId: planting.vegetable.id,
            eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
            eventTime: task.doneAt,
            payload: {
              taskId: task.id,
              actionTemplateId: task.actionTemplate.id,
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
              targetType: task.targetType,
              ownerScopeType: task.ownerScopeType ?? null,
              dueAt: task.dueAt?.toISOString() ?? null,
              doneAt: task.doneAt.toISOString(),
              description: task.description ?? null,
              scope: 'bed',
              bedId: task.bed.id,
            },
          });
        }
      }

      if (
        task.status === ActionTaskStatus.DONE &&
        task.ownerScopeType === ActionTaskOwnerScopeType.SPACE &&
        task.growingSpace != null &&
        task.actionTemplate != null &&
        task.doneAt != null
      ) {
        const TERMINAL_STATUSES = new Set([
          'FAILED',
          'CANCELLED',
          'HARVESTED',
          'CLEARED',
          'failed',
          'cancelled',
          'harvested',
          'cleared',
        ]);
        const affectedIds = Array.isArray(task.metadata?.affectedPlantingIds)
          ? (task.metadata.affectedPlantingIds as string[])
          : null;
        if (affectedIds && affectedIds.length > 0) {
          const spacePlantings = await em.find(
            Planting,
            { user: user.id, id: { $in: affectedIds } },
            { populate: ['bed', 'vegetable'] },
          );
          for (const planting of spacePlantings) {
            if (TERMINAL_STATUSES.has(planting.status)) continue;
            await this.plantingInsightsService.recordEvent({
              plantingId: planting.id,
              userId: user.id,
              bedId: planting.bed.id,
              vegetableId: planting.vegetable.id,
              eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
              eventTime: task.doneAt,
              payload: {
                taskId: task.id,
                actionTemplateId: task.actionTemplate.id,
                actionType: task.actionTemplate.type,
                decisionType:
                  typeof task.metadata?.decisionType === 'string'
                    ? task.metadata.decisionType
                    : null,
                actionTitle: task.title,
                source: task.source,
                ownerScopeType: task.ownerScopeType,
                scope: 'space',
              },
            });
          }
        }
        // If no affectedPlantingIds, do not record events for space tasks
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
          actionTemplateId: p.actionTemplateId,
          actionType: p.actionType,
          decisionType: p.decisionType,
          actionKind: p.actionKind,
          actionTitle: p.actionTitle,
          source: p.source,
          targetType: p.targetType,
          dueAt: p.dueAt,
          description: p.description,
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
          actionTemplateId: p.actionTemplateId,
          actionType: p.actionType,
          decisionType: p.decisionType,
          actionKind: p.actionKind,
          actionTitle: p.actionTitle,
          source: p.source,
          targetType: p.targetType,
          dueAt: p.dueAt,
          description: p.description,
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

  private startOfUtcDay(value: Date): Date {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
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

      if (!template.isUserSelectable) {
        throw new ForbiddenException(
          `Action template ${template.id} is not user selectable`,
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
      task.metadata = {
        ...(task.metadata ?? {}),
        manual: true,
        targetType:
          params.expectedTarget === ActionTemplateTarget.BED
            ? ActionTaskTargetType.BED
            : ActionTaskTargetType.PLANTING,
        actionTemplateId: template.id,
      };

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
    await params.em.populate(created, [
      'actionTemplate',
      'planting',
      'planting.vegetable',
      'bed',
    ]);

    return created;
  }

  private serialize(
    entity: ActionTask,
    meta?: {
      relationToCurrentPlanting?:
        | 'direct'
        | 'related_from_bed'
        | 'related_from_space'
        | null;
    },
  ) {
    return {
      id: entity.id,
      userId: entity.user.id,
      targetType: entity.targetType,
      ownerScopeType: entity.ownerScopeType ?? null,
      ownerScopeId: entity.ownerScopeId ?? null,
      plantingId: entity.planting?.id ?? null,
      vegetableName: entity.planting?.vegetable?.name ?? null,
      bedId: entity.bed?.id ?? null,
      bedName: entity.bed?.name ?? null,
      growingSpaceId: entity.growingSpace?.id ?? null,
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
      metadata: entity.metadata ?? null,
      actionTemplate: entity.actionTemplate
        ? {
            id: entity.actionTemplate.id,
            name: entity.actionTemplate.name,
            /**
             * @deprecated use `target` instead – `scope` is kept for backwards compatibility
             */
            scope: entity.actionTemplate.target,
            target: entity.actionTemplate.target,
            type: entity.actionTemplate.type,
            aggregationScope: entity.actionTemplate.aggregationScope ?? null,
            defaultDueOffsetDays: entity.actionTemplate.defaultDueOffsetDays,
          }
        : null,
      doneAt: entity.doneAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      relationToCurrentPlanting: meta?.relationToCurrentPlanting ?? null,
    };
  }

  private async getManualTemplateOrThrow(
    actionTemplateId: string,
    expectedTarget: ActionTemplateTarget,
    em: EntityManager,
  ) {
    const template = await em.findOne(ActionTemplate, {
      id: actionTemplateId,
    });

    if (!template) {
      throw new NotFoundException('Action template not found');
    }

    if (!template.isUserSelectable) {
      throw new ForbiddenException('Action template is not user selectable');
    }

    if (template.target !== expectedTarget) {
      throw new BadRequestException(
        `Action template target is not compatible with ${expectedTarget}`,
      );
    }

    return template;
  }
}
