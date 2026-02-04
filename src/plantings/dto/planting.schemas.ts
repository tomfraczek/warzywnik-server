import { z } from 'zod';
import { PlantingStatus } from '../../common/enums/planting.enums';

export type PlantingBaseDto = {
  bedId?: string;
  vegetableId?: string;
  plannedStartDate?: string;
  actualStartDate?: string | null;
  status?: PlantingStatus;
  notes?: string | null;
};

export type CreatePlantingDto = PlantingBaseDto & {
  bedId: string;
  vegetableId: string;
  plannedStartDate: string;
};

export type UpdatePlantingDto = PlantingBaseDto;

export type ListPlantingsQueryDto = {
  page: number;
  limit: number;
  bedId?: string;
  status?: PlantingStatus;
  fromDate?: string;
  toDate?: string;
};

const isoDateSchema = z.string().datetime();

const basePlantingSchema = z.object({
  bedId: z.string().uuid().optional(),
  vegetableId: z.string().uuid().optional(),
  plannedStartDate: isoDateSchema.optional(),
  actualStartDate: isoDateSchema.nullable().optional(),
  status: z.nativeEnum(PlantingStatus).optional(),
  notes: z.string().min(1).nullable().optional(),
});

export const createPlantingSchema = basePlantingSchema.extend({
  bedId: basePlantingSchema.shape.bedId.unwrap(),
  vegetableId: basePlantingSchema.shape.vegetableId.unwrap(),
  plannedStartDate: basePlantingSchema.shape.plannedStartDate.unwrap(),
});

export const updatePlantingSchema = basePlantingSchema;

export const listPlantingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  bedId: z.string().uuid().optional(),
  status: z.nativeEnum(PlantingStatus).optional(),
  fromDate: isoDateSchema.optional(),
  toDate: isoDateSchema.optional(),
});
