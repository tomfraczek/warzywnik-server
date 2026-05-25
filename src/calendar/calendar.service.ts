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
    const { from, to } = this.resolveRangeBounds(user, query);

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
        populate: ['actionTemplate', 'bed', 'planting', 'growingSpace'],
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
        targetType: task.targetType,
        ownerScopeType: task.ownerScopeType ?? null,
        ownerScopeId: task.ownerScopeId ?? null,
        bedId: task.bed?.id ?? null,
        plantingId: task.planting?.id ?? null,
        growingSpaceId: task.growingSpace?.id ?? null,
        source: task.source,
        sourceType: task.sourceType,
        title: task.title,
        actionTemplate: task.actionTemplate
          ? {
              id: task.actionTemplate.id,
              name: task.actionTemplate.name,
              /**
               * @deprecated use `target` instead
               */
              scope: task.actionTemplate.target,
              target: task.actionTemplate.target,
              aggregationScope: task.actionTemplate.aggregationScope ?? null,
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

  private resolveRangeBounds(
    user: User,
    query: GetCalendarQueryDto,
  ): {
    from: Date;
    to: Date;
  } {
    const timezone =
      typeof user.timezone === 'string' && user.timezone.length > 0
        ? user.timezone
        : 'UTC';

    const fromBounds = this.localDayBoundsUtc(query.from, timezone);
    const toBounds = this.localDayBoundsUtc(query.to, timezone);

    if (fromBounds && toBounds) {
      return { from: fromBounds.start, to: toBounds.end };
    }

    return {
      from: new Date(`${query.from}T00:00:00.000Z`),
      to: new Date(`${query.to}T23:59:59.999Z`),
    };
  }

  private localDayBoundsUtc(
    localDate: string,
    timeZone: string,
  ): { start: Date; end: Date } | null {
    const [yearRaw, monthRaw, dayRaw] = localDate.split('-').map(Number);
    if (!yearRaw || !monthRaw || !dayRaw) {
      return null;
    }

    try {
      return {
        start: this.zonedTimeToUtc(
          timeZone,
          yearRaw,
          monthRaw,
          dayRaw,
          0,
          0,
          0,
          0,
        ),
        end: this.zonedTimeToUtc(
          timeZone,
          yearRaw,
          monthRaw,
          dayRaw,
          23,
          59,
          59,
          999,
        ),
      };
    } catch {
      return null;
    }
  }

  private zonedTimeToUtc(
    timeZone: string,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    ms: number,
  ): Date {
    let utcTs = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    const targetTs = Date.UTC(year, month - 1, day, hour, minute, second, ms);

    for (let i = 0; i < 4; i += 1) {
      const local = this.toParts(new Date(utcTs), timeZone);
      const localTs = Date.UTC(
        local.year,
        local.month - 1,
        local.day,
        local.hour,
        local.minute,
        local.second,
        0,
      );
      const diff = targetTs - localTs;
      if (diff === 0) {
        break;
      }
      utcTs += diff;
    }

    return new Date(utcTs);
  }

  private toParts(
    date: Date,
    timeZone: string,
  ): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const partByType = new Map(parts.map((item) => [item.type, item.value]));

    return {
      year: Number(partByType.get('year') ?? '1970'),
      month: Number(partByType.get('month') ?? '01'),
      day: Number(partByType.get('day') ?? '01'),
      hour: Number(partByType.get('hour') ?? '00'),
      minute: Number(partByType.get('minute') ?? '00'),
      second: Number(partByType.get('second') ?? '00'),
    };
  }
}
