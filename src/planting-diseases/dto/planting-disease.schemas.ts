import { z } from 'zod';
import {
  PlantingDiseaseSeverity,
  PlantingDiseaseStatus,
} from '../../common/enums/planting-disease.enums';

export type CreatePlantingDiseaseDto = {
  diseaseId: string;
  status?: PlantingDiseaseStatus;
  severity?: PlantingDiseaseSeverity | null;
  observedAt?: string;
  notes?: string | null;
};

export type UpdatePlantingDiseaseDto = {
  status?: PlantingDiseaseStatus;
  severity?: PlantingDiseaseSeverity | null;
  observedAt?: string;
  notes?: string | null;
};

export type ListPlantingDiseasesQueryDto = {
  status: 'active' | 'resolved' | 'all';
};

const isoDateSchema = z.string().datetime();

export const createPlantingDiseaseSchema = z.object({
  diseaseId: z.string().uuid(),
  status: z.nativeEnum(PlantingDiseaseStatus).optional(),
  severity: z.nativeEnum(PlantingDiseaseSeverity).nullable().optional(),
  observedAt: isoDateSchema.optional(),
  notes: z.string().min(1).nullable().optional(),
});

export const updatePlantingDiseaseSchema = z.object({
  status: z.nativeEnum(PlantingDiseaseStatus).optional(),
  severity: z.nativeEnum(PlantingDiseaseSeverity).nullable().optional(),
  observedAt: isoDateSchema.optional(),
  notes: z.string().min(1).nullable().optional(),
});

export const listPlantingDiseasesQuerySchema = z.object({
  status: z.enum(['active', 'resolved', 'all']).default('active'),
});
