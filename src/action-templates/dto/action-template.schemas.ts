import { z } from 'zod';
import {
  ActionTemplateTarget,
  ActionTemplateType,
} from '../../common/enums/action.enums';

export type ActionTemplateBaseDto = {
  slug?: string;
  name?: string;
  description?: string | null;
  target?: ActionTemplateTarget;
  type?: ActionTemplateType;
  defaultDueOffsetDays?: number;
};

export type CreateActionTemplateDto = ActionTemplateBaseDto & {
  slug: string;
  name: string;
  target: ActionTemplateTarget;
  type: ActionTemplateType;
};

export type UpdateActionTemplateDto = ActionTemplateBaseDto;

export type ListActionTemplatesQueryDto = {
  page: number;
  limit: number;
  q?: string;
};

const baseActionTemplateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens')
    .optional(),
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(1).nullable().optional(),
  target: z.nativeEnum(ActionTemplateTarget).optional(),
  type: z.nativeEnum(ActionTemplateType).optional(),
  defaultDueOffsetDays: z.coerce.number().int().min(0).max(3650).optional(),
});

export const createActionTemplateSchema = baseActionTemplateSchema.extend({
  slug: baseActionTemplateSchema.shape.slug.unwrap(),
  name: baseActionTemplateSchema.shape.name.unwrap(),
  target: baseActionTemplateSchema.shape.target.unwrap(),
  type: baseActionTemplateSchema.shape.type.unwrap(),
});

export const updateActionTemplateSchema = baseActionTemplateSchema;

export const listActionTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
});
