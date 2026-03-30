import { z } from 'zod';
import {
  ArticleContext,
  ArticleSeason,
  ArticleStatus,
} from '../../common/enums/article.enums';

export type ArticleBaseDto = {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string | null;
  months?: number[];
  seasons?: ArticleSeason[];
  contexts?: ArticleContext[];
  priority?: number;
  relatedVegetableIds?: string[];
  relatedSoilIds?: string[];
  relatedFertilizerIds?: string[];
  relatedDiseaseIds?: string[];
  relatedPestIds?: string[];
  status?: ArticleStatus;
  publishedAt?: Date | null;
};

export type CreateArticleDto = ArticleBaseDto & {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  contexts: ArticleContext[];
};

export type UpdateArticleDto = ArticleBaseDto;

export type DeleteArticlesBulkDto = {
  ids: string[];
};

export type ListArticlesQueryDto = {
  page: number;
  limit: number;
  q?: string;
  status?: ArticleStatus;
  month?: number;
  season?: ArticleSeason;
  context?: ArticleContext;
  vegetableId?: string;
  soilId?: string;
  fertilizerId?: string;
  diseaseId?: string;
  pestId?: string;
};

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens');
const titleSchema = z.string().min(2).max(200);
const excerptSchema = z.string().min(1);
const contentSchema = z.string().min(1);
const prioritySchema = z.number().int().min(1).max(5);

const monthItemSchema = z.number().int().min(1).max(12);
const monthsSchema = z.array(monthItemSchema);

const seasonSchema = z.nativeEnum(ArticleSeason);
const seasonsSchema = z.array(seasonSchema);

const contextSchema = z.nativeEnum(ArticleContext);
const contextsSchema = z.array(contextSchema).min(1);

const slugRefSchema = z.string().min(1).max(180);
const slugRefArraySchema = z.array(slugRefSchema);
const statusSchema = z.nativeEnum(ArticleStatus);
const coverImageSchema = z.string().max(255).nullable();

const baseArticleSchema = z
  .object({
    slug: slugSchema.optional(),
    title: titleSchema.optional(),
    excerpt: excerptSchema.optional(),
    content: contentSchema.optional(),
    coverImageUrl: coverImageSchema.optional(),
    months: monthsSchema.optional(),
    seasons: seasonsSchema.optional(),
    contexts: contextsSchema.optional(),
    priority: prioritySchema.optional(),
    relatedVegetableIds: slugRefArraySchema.optional(),
    relatedSoilIds: slugRefArraySchema.optional(),
    relatedFertilizerIds: slugRefArraySchema.optional(),
    relatedDiseaseIds: slugRefArraySchema.optional(),
    relatedPestIds: slugRefArraySchema.optional(),
    status: statusSchema.optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .strict();

export const createArticleSchema = baseArticleSchema.extend({
  slug: slugSchema,
  title: titleSchema,
  excerpt: excerptSchema,
  content: contentSchema,
  contexts: contextsSchema,
  months: monthsSchema.default([]),
  seasons: seasonsSchema.default([]),
  priority: prioritySchema.default(3),
  relatedVegetableIds: slugRefArraySchema.default([]),
  relatedSoilIds: slugRefArraySchema.default([]),
  relatedFertilizerIds: slugRefArraySchema.default([]),
  relatedDiseaseIds: slugRefArraySchema.default([]),
  relatedPestIds: slugRefArraySchema.default([]),
  status: statusSchema.default(ArticleStatus.DRAFT),
});

export const updateArticleSchema = baseArticleSchema;

export const deleteArticlesBulkSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1),
  })
  .strict();

export const listArticlesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().min(1).optional(),
    status: statusSchema.optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    season: seasonSchema.optional(),
    context: contextSchema.optional(),
    vegetableId: slugRefSchema.optional(),
    soilId: slugRefSchema.optional(),
    fertilizerId: slugRefSchema.optional(),
    diseaseId: slugRefSchema.optional(),
    pestId: slugRefSchema.optional(),
  })
  .strict();
