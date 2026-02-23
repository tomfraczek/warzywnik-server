import { z } from 'zod';
import { ReminderStatus } from '../../common/enums/reminder.enums';

export type GetCalendarQueryDto = {
  from: string;
  to: string;
  includeDoneTasks?: boolean;
  includeReminders?: boolean;
};

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD date format');

export const getCalendarQuerySchema = z
  .object({
    from: dateOnlySchema,
    to: dateOnlySchema,
    includeDoneTasks: z.coerce.boolean().optional().default(false),
    includeReminders: z.coerce.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from must be <= to',
        path: ['from'],
      });
    }
  });

export const calendarReminderStatuses = [
  ReminderStatus.PENDING,
  ReminderStatus.PROCESSING,
  ReminderStatus.SENT,
] as const;
