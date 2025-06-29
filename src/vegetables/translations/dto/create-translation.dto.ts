import { z } from 'zod';

export const createVegetableTranslationSchema = z.object({
  vegetableId: z.string(),
  lang: z.string().min(2).max(5),
  name: z.string().min(1),
  description: z.string().min(1),
});
