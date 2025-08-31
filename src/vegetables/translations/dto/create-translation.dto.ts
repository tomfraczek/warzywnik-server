import { z } from 'zod';

export const createVegetableTranslationSchema = z.object({
  vegetableId: z.string(),
  lang: z.string().min(2).max(5),
  name: z.string().min(1),
  description: z.string().min(1),

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

export type CreateVegetableTranslationDto = z.infer<
  typeof createVegetableTranslationSchema
>;
