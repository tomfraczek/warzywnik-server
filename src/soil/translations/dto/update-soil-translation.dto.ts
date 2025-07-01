import { z } from 'zod';

export const updateSoilTranslationSchema = z.object({
  lang: z.enum(['pl', 'en'], {
    errorMap: () => ({ message: 'Lang must be either "pl" or "en"' }),
  }),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  advantages: z.string().optional(),
  disadvantages: z.string().optional(),
});

export type UpdateSoilTranslationDto = z.infer<
  typeof updateSoilTranslationSchema
>;
