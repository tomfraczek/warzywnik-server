import { z } from 'zod';

export type PestBaseDto = {
  name?: string;
  description?: string;
  symptoms?: string | null;
  prevention?: string | null;
  treatment?: string | null;
  recommendedActionTemplateIds?: string[];
};

export type CreatePestDto = PestBaseDto & {
  name: string;
  description: string;
};

export type UpdatePestDto = PestBaseDto;

export type DeletePestsBulkDto = {
  ids: string[];
};

export type ListPestsQueryDto = {
  page: number;
  limit: number;
  q?: string;
};

const basePestSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(1).optional(),
  symptoms: z.string().min(1).nullable().optional(),
  prevention: z.string().min(1).nullable().optional(),
  treatment: z.string().min(1).nullable().optional(),
  recommendedActionTemplateIds: z.array(z.string().min(1).max(180)).optional(),
});

export const createPestSchema = basePestSchema.extend({
  name: basePestSchema.shape.name.unwrap(),
  description: basePestSchema.shape.description.unwrap(),
});

export const updatePestSchema = basePestSchema;

export const deletePestsBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const listPestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
});
