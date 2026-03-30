import { z } from 'zod';

export type DiseaseBaseDto = {
  name?: string;
  description?: string;
  symptoms?: string;
  prevention?: string;
  treatment?: string;
  recommendedActionTemplateIds?: string[];
};

export type CreateDiseaseDto = DiseaseBaseDto & {
  name: string;
  description: string;
  symptoms: string;
  prevention: string;
  treatment: string;
};

export type UpdateDiseaseDto = DiseaseBaseDto;

export type DeleteDiseasesBulkDto = {
  ids: string[];
};

export type ListDiseasesQueryDto = {
  page: number;
  limit: number;
  q?: string;
};

const baseDiseaseSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(1).optional(),
  symptoms: z.string().min(1).optional(),
  prevention: z.string().min(1).optional(),
  treatment: z.string().min(1).optional(),
  recommendedActionTemplateIds: z.array(z.string().min(1).max(180)).optional(),
});

export const createDiseaseSchema = baseDiseaseSchema.extend({
  name: baseDiseaseSchema.shape.name.unwrap(),
  description: baseDiseaseSchema.shape.description.unwrap(),
  symptoms: baseDiseaseSchema.shape.symptoms.unwrap(),
  prevention: baseDiseaseSchema.shape.prevention.unwrap(),
  treatment: baseDiseaseSchema.shape.treatment.unwrap(),
});

export const updateDiseaseSchema = baseDiseaseSchema;

export const deleteDiseasesBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const listDiseasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
});
