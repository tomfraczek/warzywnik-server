import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import {
  ActionRuleTrigger,
  ActionTaskTargetType,
  ActionTemplateTarget,
} from '../common/enums/action.enums';
import { VegetableActionRule } from '../vegetables/vegetable-action-rule.entity';
import { ActionTask } from './action-task.entity';
import { Reminder } from '../reminders/reminder.entity';
import { ReminderAction, ReminderStatus } from '../common/enums/reminder.enums';

@Injectable()
export class ActionAutomationService {
  constructor(private readonly em: EntityManager) {}

  async applyVegetableRules(params: {
    user: User;
    planting: Planting;
    bed: Bed;
    vegetable: Vegetable;
    trigger: ActionRuleTrigger;
    baseDate: Date;
  }) {
    if (params.trigger === 'ON_HARVEST_CONFIRMED') {
      return [];
    }

    return this.em.transactional(async (em) => {
      const rules = await em.find(
        VegetableActionRule,
        {
          vegetable: params.vegetable.id,
          trigger: params.trigger,
          isEnabled: true,
        },
        {
          populate: ['actionTemplate'],
        },
      );

      const created: ActionTask[] = [];

      for (const rule of rules) {
        const dueAt = this.addDays(params.baseDate, rule.offsetDays);

        const existingRows = await em.getConnection().execute<{ id: string }[]>(
          `
            select id
            from action_tasks
            where user_id = ?
              and source = 'VEGETABLE_RULE'
              and source_ref_id = ?
              and due_at = ?
            limit 1
          `,
          [params.user.id, rule.id, dueAt.toISOString()],
        );

        if (existingRows.length > 0) {
          continue;
        }

        const task = new ActionTask();
        task.user = params.user;
        task.actionTemplate = rule.actionTemplate;
        task.title = rule.actionTemplate.name;
        task.description = rule.actionTemplate.description ?? null;
        task.dueAt = dueAt;
        task.status = 'pending' as ActionTask['status'];
        task.sourceRefId = rule.id;

        if (rule.actionTemplate.target === ActionTemplateTarget.BED) {
          task.targetType = ActionTaskTargetType.BED;
          task.bed = params.bed;
          task.planting = null;
        } else {
          task.targetType = ActionTaskTargetType.PLANTING;
          task.planting = params.planting;
          task.bed = null;
        }

        em.persist(task);
        await em.flush();

        await em.nativeUpdate(
          ActionTask,
          { id: task.id },
          {
            source: 'VEGETABLE_RULE' as never,
            sourceRefId: rule.id,
          },
        );

        await em.nativeUpdate(
          Reminder,
          {
            actionTaskId: task.id,
            status: {
              $in: [ReminderStatus.PENDING, ReminderStatus.PROCESSING],
            },
          },
          {
            status: ReminderStatus.CANCELED,
            lockedAt: null,
            lastError: null,
          },
        );

        const reminder = new Reminder();
        reminder.user = params.user;
        reminder.type = 'ACTION_TASK_DUE' as Reminder['type'];
        reminder.status = 'pending' as Reminder['status'];
        reminder.scheduledAt = dueAt;
        reminder.actionTaskId = task.id;
        reminder.payload = {
          kind: 'action',
          actionTaskId: task.id,
          actionTemplateId: rule.actionTemplate.id,
          actionTemplateName: rule.actionTemplate.name,
          bedId: task.bed?.id,
          plantingId: task.planting?.id,
          action: ReminderAction.CHECK,
        };
        reminder.attempts = 0;
        reminder.lockedAt = null;
        reminder.lastError = null;
        em.persist(reminder);

        created.push(task);
      }

      await em.flush();

      return created;
    });
  }

  async getPostHarvestActionSuggestions(vegetableId: string) {
    const rules = await this.em.find(
      VegetableActionRule,
      {
        vegetable: vegetableId,
        trigger: 'ON_HARVEST_CONFIRMED' as ActionRuleTrigger,
        isEnabled: true,
      },
      {
        populate: ['actionTemplate'],
        orderBy: [{ offsetDays: 'asc' }, { createdAt: 'asc' }],
      },
    );

    return rules.map((rule) => ({
      actionTemplate: {
        id: rule.actionTemplate.id,
        slug: rule.actionTemplate.slug,
        name: rule.actionTemplate.name,
        scope: rule.actionTemplate.target,
        target: rule.actionTemplate.target,
        type: rule.actionTemplate.type,
        description: rule.actionTemplate.description ?? null,
        defaultDueOffsetDays: rule.actionTemplate.defaultDueOffsetDays,
      },
      offsetDays: rule.offsetDays,
    }));
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
