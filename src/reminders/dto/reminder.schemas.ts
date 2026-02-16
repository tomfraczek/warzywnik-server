import { z } from 'zod';
import { ReminderStatus } from '../../common/enums/reminder.enums';

export type ListRemindersQueryDto = {
  page: number;
  limit: number;
  status: ReminderStatus;
};

export type PatchReminderDto = {
  status: ReminderStatus.DONE | ReminderStatus.SKIPPED;
};

export const listRemindersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(ReminderStatus).default(ReminderStatus.PENDING),
});

export const patchReminderSchema = z.object({
  status: z.enum([ReminderStatus.DONE, ReminderStatus.SKIPPED]),
});
