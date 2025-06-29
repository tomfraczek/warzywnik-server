import { z } from 'zod';

export const updateVegetableTranslationSchema = z.object({
  lang: z.string().min(2).max(5).optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});
