import { z } from 'zod';
import {
  Language,
  SubscriptionPlan,
  ThemeMode,
} from '../../common/enums/user.enums';

const booleanQuery = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean(),
);

export const listAdminUsersQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  plan: z.enum(['subscription', 'trial', 'free']).optional(),
  isActive: booleanQuery.optional(),
  isAdmin: booleanQuery.optional(),
  sort: z
    .enum(['createdAt', 'lastLoginAt', 'email', 'displayName', 'isActive'])
    .optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const patchAdminUserSchema = z
  .object({
    displayName: z.string().trim().min(1).max(50).nullable().optional(),
    isAdmin: z.boolean().optional(),
    isActive: z.boolean().optional(),
    subscriptionPlan: z.nativeEnum(SubscriptionPlan).optional(),
    subscriptionExpiresAt: z.coerce.date().nullable().optional(),
    trialStartedAt: z.coerce.date().nullable().optional(),
    trialEndsAt: z.coerce.date().nullable().optional(),
    notificationsEnabled: z.boolean().optional(),
    automaticTasksEnabled: z.boolean().optional(),
    tutorialsEnabled: z.boolean().optional(),
    notificationHour: z.number().int().min(0).max(23).optional(),
    themeMode: z.nativeEnum(ThemeMode).optional(),
    language: z.nativeEnum(Language).optional(),
    locale: z.string().trim().min(2).max(16).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export type ListAdminUsersQueryDto = z.infer<typeof listAdminUsersQuerySchema>;
export type PatchAdminUserDto = z.infer<typeof patchAdminUserSchema>;
