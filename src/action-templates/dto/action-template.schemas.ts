import { z } from 'zod';
import {
  ActionTemplateEnvironment,
  ActionTemplateTarget,
  ActionTemplateType,
} from '../../common/enums/action.enums';

export type ActionTemplateBaseDto = {
  name?: string;
  description?: string | null;
  target?: ActionTemplateTarget;
  environment?: ActionTemplateEnvironment;
  type?: ActionTemplateType;
  defaultDueOffsetDays?: number | null;
};

export type CreateActionTemplateDto = ActionTemplateBaseDto & {
  name: string;
  target: ActionTemplateTarget;
  environment?: ActionTemplateEnvironment;
  type: ActionTemplateType;
};

export type UpdateActionTemplateDto = ActionTemplateBaseDto;

export type DeleteActionTemplatesBulkDto = {
  ids: string[];
};

export type ListActionTemplatesQueryDto = {
  page: number;
  limit: number;
  q?: string;
};

const baseActionTemplateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(1).nullable().optional(),
  target: z.nativeEnum(ActionTemplateTarget).optional(),
  environment: z.nativeEnum(ActionTemplateEnvironment).optional(),
  type: z.nativeEnum(ActionTemplateType).optional(),
  defaultDueOffsetDays: z.union([z.coerce.number().int(), z.null()]).optional(),
});

export const createActionTemplateSchema = baseActionTemplateSchema.extend({
  name: baseActionTemplateSchema.shape.name.unwrap(),
  target: baseActionTemplateSchema.shape.target.unwrap(),
  environment: baseActionTemplateSchema.shape.environment.default(
    ActionTemplateEnvironment.ANY,
  ),
  type: baseActionTemplateSchema.shape.type.unwrap(),
});

export const updateActionTemplateSchema = baseActionTemplateSchema;

export const deleteActionTemplatesBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const listActionTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
});
