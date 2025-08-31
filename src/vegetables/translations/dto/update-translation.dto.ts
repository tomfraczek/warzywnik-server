import { z } from 'zod';

export const updateVegetableTranslationSchema = z.object({
  lang: z.string().min(2).max(5).optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),

  // 🌱 NEW — optional descriptive cultivation sections
  prePlanting: z.string().optional(),
  inSeasonFeeding: z.string().optional(),
  warnings: z.string().optional(),
  watering: z.string().optional(),
  mulching: z.string().optional(),
  trainingSupport: z.string().optional(),
  weeding: z.string().optional(),
  pestPrevention: z.string().optional(),
});

export type UpdateVegetableTranslationDto = z.infer<
  typeof updateVegetableTranslationSchema
>;
