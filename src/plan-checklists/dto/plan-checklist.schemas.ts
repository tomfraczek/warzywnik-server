import { z } from 'zod';
import {
  PlanChecklistPriority,
  PlanChecklistStatus,
} from '../../common/enums/plan-checklist.enums';

export type GetBedPlanQueryDto = {
  includeArchived?: boolean;
};

export type CreateManualPlanChecklistItemDto = {
  title: string;
  description?: string | null;
  priority?: PlanChecklistPriority;
  plantingId?: string;
};

export type PatchPlanChecklistItemDto = {
  status?: PlanChecklistStatus;
  title?: string;
  description?: string | null;
  priority?: PlanChecklistPriority;
};

export const getBedPlanQuerySchema = z.object({
  includeArchived: z.coerce.boolean().optional().default(false),
});

export const createManualPlanChecklistItemSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).nullable().optional(),
  priority: z.nativeEnum(PlanChecklistPriority).optional(),
  plantingId: z.string().uuid().optional(),
});

export const patchPlanChecklistItemSchema = z
  .object({
    status: z.nativeEnum(PlanChecklistStatus).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).nullable().optional(),
    priority: z.nativeEnum(PlanChecklistPriority).optional(),
  })
  .refine(
    (val) =>
      val.status !== undefined ||
      val.title !== undefined ||
      val.description !== undefined ||
      val.priority !== undefined,
    {
      message:
        'At least one field must be provided: status, title, description, priority',
    },
  );
