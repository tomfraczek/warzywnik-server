import { z } from 'zod';
import { ActionTaskStatus } from '../../common/enums/action.enums';

export type CreateActionTaskDto = {
  actionTemplateId?: string;
  dueAt?: string;
  title?: string;
  description?: string | null;
};

export type ListActionTasksQueryDto = {
  status: 'planned' | 'done' | 'all';
  from?: string;
  to?: string;
};

export type PatchActionTaskDto = {
  status?: ActionTaskStatus;
  dueAt?: string | null;
  title?: string;
  description?: string | null;
};

const isoDateSchema = z.string().datetime();

export const createActionTaskSchema = z
  .object({
    actionTemplateId: z.string().uuid().optional(),
    dueAt: isoDateSchema.optional(),
    title: z.string().min(1).max(180).optional(),
    description: z.string().min(1).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.actionTemplateId && !value.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'title is required when actionTemplateId is not provided',
        path: ['title'],
      });
    }
  });

export const listActionTasksQuerySchema = z.object({
  status: z.enum(['planned', 'done', 'all']).default('all'),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const patchActionTaskSchema = z
  .object({
    status: z.nativeEnum(ActionTaskStatus).optional(),
    dueAt: isoDateSchema.nullable().optional(),
    title: z.string().min(1).max(180).optional(),
    description: z.string().min(1).nullable().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.dueAt !== undefined ||
      value.title !== undefined ||
      value.description !== undefined,
    {
      message: 'At least one field is required',
    },
  );
