import { z } from 'zod';

export type DiseaseBaseDto = {
  slug?: string;
  name?: string;
  description?: string;
  symptoms?: string | null;
  prevention?: string | null;
  treatment?: string | null;
};

export type CreateDiseaseDto = DiseaseBaseDto & {
  slug: string;
  name: string;
  description: string;
};

export type UpdateDiseaseDto = DiseaseBaseDto;

export type ListDiseasesQueryDto = {
  page: number;
  limit: number;
  q?: string;
};

const baseDiseaseSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens')
    .optional(),
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(1).optional(),
  symptoms: z.string().min(1).nullable().optional(),
  prevention: z.string().min(1).nullable().optional(),
  treatment: z.string().min(1).nullable().optional(),
});

export const createDiseaseSchema = baseDiseaseSchema.extend({
  slug: baseDiseaseSchema.shape.slug.unwrap(),
  name: baseDiseaseSchema.shape.name.unwrap(),
  description: baseDiseaseSchema.shape.description.unwrap(),
});

export const updateDiseaseSchema = baseDiseaseSchema;

export const listDiseasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
});
