import { z } from 'zod';
import { SunExposure, WateringNeeds } from '../entities/vegetable.entity';

export const createVegetableSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  latinName: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url(),

  sowingTimeStart: z.string(),
  sowingTimeEnd: z.string(),
  harvestTimeStart: z.string(),
  harvestTimeEnd: z.string(),

  germinationDays: z.number().int().min(1),
  sowingDepthCm: z.number().min(0),
  rowSpacingCm: z.number().min(0),
  plantSpacingCm: z.number().min(0),

  isDirectSow: z.boolean(),
  isPerennial: z.boolean(),

  sunExposure: z.nativeEnum(SunExposure),
  wateringNeeds: z.nativeEnum(WateringNeeds),

  soilType: z.string().uuid().optional(), // id gleby
});
