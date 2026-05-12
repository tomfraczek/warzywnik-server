import { z } from 'zod';
import {
  ActionTemplateAggregationScope,
  ActionTemplateEnvironment,
  ActionTemplateGenerationMode,
  ActionTemplatePriority,
  ActionTemplateTarget,
  ActionTemplateType,
} from '../../common/enums/action.enums';

export type ActionTemplateBaseDto = {
  name?: string;
  description?: string | null;
  isUserSelectable?: boolean;
  target?: ActionTemplateTarget;
  environment?: ActionTemplateEnvironment;
  type?: ActionTemplateType;
  generationMode?: ActionTemplateGenerationMode;
  priority?: ActionTemplatePriority;
  aggregationScope?: ActionTemplateAggregationScope;
  maxAutoOccurrencesPerPlanting?: number | null;
  minDaysBetweenOccurrences?: number | null;
  requiresUserConfirmation?: boolean;
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

export type ListManualActionTemplatesQueryDto = {
  target?: ActionTemplateTarget;
  q?: string;
};

const baseActionTemplateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(1).nullable().optional(),
  isUserSelectable: z.coerce.boolean().optional(),
  target: z.nativeEnum(ActionTemplateTarget).optional(),
  environment: z.nativeEnum(ActionTemplateEnvironment).optional(),
  type: z.nativeEnum(ActionTemplateType).optional(),
  generationMode: z.nativeEnum(ActionTemplateGenerationMode).optional(),
  priority: z.nativeEnum(ActionTemplatePriority).optional(),
  aggregationScope: z.nativeEnum(ActionTemplateAggregationScope).optional(),
  maxAutoOccurrencesPerPlanting: z
    .union([z.coerce.number().int().min(1), z.null()])
    .optional(),
  minDaysBetweenOccurrences: z
    .union([z.coerce.number().int().min(1), z.null()])
    .optional(),
  requiresUserConfirmation: z.coerce.boolean().optional(),
  defaultDueOffsetDays: z.union([z.coerce.number().int(), z.null()]).optional(),
});

export const createActionTemplateSchema = baseActionTemplateSchema.extend({
  name: baseActionTemplateSchema.shape.name.unwrap(),
  target: baseActionTemplateSchema.shape.target.unwrap(),
  environment: baseActionTemplateSchema.shape.environment.default(
    ActionTemplateEnvironment.ANY,
  ),
  aggregationScope: baseActionTemplateSchema.shape.aggregationScope.default(
    ActionTemplateAggregationScope.NONE,
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

export const listManualActionTemplatesQuerySchema = z.object({
  target: z
    .nativeEnum(ActionTemplateTarget)
    .refine(
      (value) =>
        value === ActionTemplateTarget.BED ||
        value === ActionTemplateTarget.PLANTING,
      {
        message: 'target must be either bed or planting',
      },
    )
    .optional(),
  q: z.string().min(1).optional(),
});
