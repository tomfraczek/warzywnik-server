import { z } from 'zod';

export type ListNotificationsQueryDto = {
  status: 'all' | 'unread' | 'read';
  page: number;
  limit: number;
};

export const listNotificationsQuerySchema = z
  .object({
    status: z.enum(['all', 'unread', 'read']).default('all'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
