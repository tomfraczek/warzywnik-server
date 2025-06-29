import { z } from 'zod';

export const createSoilTranslationSchema = z.object({
  soilId: z.string().uuid(),
  lang: z.string().min(2),
  name: z.string().min(1),
  description: z.string().optional(),
  advantages: z.string().optional(),
  disadvantages: z.string().optional(),
});

export type CreateSoilTranslationDto = z.infer<
  typeof createSoilTranslationSchema
>;
