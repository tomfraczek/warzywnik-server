import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTask } from '../action-tasks/action-task.entity';
import { User } from '../users/user.entity';
import {
  GetCalendarQueryDto,
  calendarReminderStatuses,
} from './dto/calendar.schemas';
import { ActionTaskStatus } from '../common/enums/action.enums';
import { Planting } from '../plantings/planting.entity';
import { Reminder } from '../reminders/reminder.entity';

@Injectable()
export class CalendarService {
  constructor(private readonly em: EntityManager) {}

  async getCalendar(user: User, query: GetCalendarQueryDto) {
    const from = new Date(`${query.from}T00:00:00.000Z`);
    const to = new Date(`${query.to}T23:59:59.999Z`);

    const taskStatuses = query.includeDoneTasks
      ? [
          ActionTaskStatus.PENDING,
          ActionTaskStatus.DONE,
          ActionTaskStatus.CANCELED,
        ]
      : [ActionTaskStatus.PENDING];

    const tasks: ActionTask[] = await this.em.find(
      ActionTask,
      {
        user: user.id,
        dueAt: { $gte: from, $lte: to },
        status: { $in: taskStatuses },
      },
      {
        populate: ['actionTemplate', 'bed', 'planting'],
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      },
    );

    const harvestPlantings: Planting[] = await this.em.find(
      Planting,
      {
        user: user.id,
        $or: [
          {
            harvestWindowStart: { $lte: to },
            harvestWindowEnd: { $gte: from },
          },
          {
            harvestWindowStart: { $gte: from, $lte: to },
          },
        ],
      },
      {
        populate: ['vegetable', 'bed'],
        orderBy: [{ harvestWindowStart: 'asc' }],
      },
    );

    const reminders: Reminder[] = query.includeReminders
      ? await this.em.find(
          Reminder,
          {
            user: user.id,
            scheduledAt: { $gte: from, $lte: to },
            status: { $in: calendarReminderStatuses },
          },
          {
            orderBy: [{ scheduledAt: 'asc' }],
          },
        )
      : [];

    return {
      tasks: tasks.map((task) => ({
        id: task.id,
        status: task.status,
        dueAt: task.dueAt,
        bedId: task.bed?.id ?? null,
        plantingId: task.planting?.id ?? null,
        source: task.sourceRefId ? 'VEGETABLE_RULE' : 'MANUAL',
        title: task.title,
        actionTemplate: task.actionTemplate
          ? {
              id: task.actionTemplate.id,
              name: task.actionTemplate.name,
              scope: task.actionTemplate.target,
              type: task.actionTemplate.type,
            }
          : null,
      })),
      harvestEvents: harvestPlantings.map((planting) => ({
        plantingId: planting.id,
        bedId: planting.bed.id,
        vegetable: {
          id: planting.vegetable.id,
          name: planting.vegetable.name,
        },
        start: planting.harvestWindowStart ?? null,
        end: planting.harvestWindowEnd ?? null,
        harvestedAt: planting.harvestedAt ?? null,
      })),
      reminders: reminders.map((reminder) => ({
        id: reminder.id,
        type: reminder.type,
        status: reminder.status,
        scheduledAt: reminder.scheduledAt,
        actionTaskId: reminder.actionTaskId ?? null,
      })),
    };
  }
}
