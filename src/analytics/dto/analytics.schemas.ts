import { z } from 'zod';
import { AnalyticsEventType } from '../../common/enums/analytics.enums';
import { FavoriteTargetType } from '../../common/enums/favorite.enums';

const targetSlugSchema = z.string().trim().min(1).max(180);

const trackEventSchema = z
  .object({
    eventType: z.nativeEnum(AnalyticsEventType),
    targetType: z.nativeEnum(FavoriteTargetType),
    targetSlug: targetSlugSchema,
    sessionId: z.string().trim().min(1).max(120).optional(),
    idempotencyKey: z.string().trim().min(1).max(120).optional(),
    occurredAt: z.coerce.date().optional(),
    valueInt: z.number().int().optional(),
    valueNum: z.number().finite().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.eventType.startsWith('ARTICLE_') &&
      value.targetType !== FavoriteTargetType.ARTICLE
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ARTICLE_* events require targetType ARTICLE',
        path: ['targetType'],
      });
    }

    if (
      value.eventType === AnalyticsEventType.VEGETABLE_ADDED_TO_BED &&
      value.targetType !== FavoriteTargetType.VEGETABLE
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VEGETABLE_ADDED_TO_BED requires targetType VEGETABLE',
        path: ['targetType'],
      });
    }
  });

export const trackEventsSchema = z.object({
  events: z.array(trackEventSchema).min(1).max(100),
});

const vegetableSortSchema = z.enum(['adds', 'favorites']);
const articleSortSchema = z.enum([
  'views',
  'engagedSeconds',
  'scroll50',
  'scroll90',
  'favorites',
]);

export const popularVegetablesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: vegetableSortSchema.default('adds'),
  windowDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const popularArticlesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: articleSortSchema.default('views'),
});

export const cmsDashboardQuerySchema = z.object({
  top: z.coerce.number().int().min(1).max(100).default(10),
});

export type TrackEventDto = z.infer<typeof trackEventSchema>;
export type TrackEventsDto = z.infer<typeof trackEventsSchema>;
export type PopularVegetablesQueryDto = z.infer<
  typeof popularVegetablesQuerySchema
>;
export type PopularArticlesQueryDto = z.infer<
  typeof popularArticlesQuerySchema
>;
export type CmsDashboardQueryDto = z.infer<typeof cmsDashboardQuerySchema>;
