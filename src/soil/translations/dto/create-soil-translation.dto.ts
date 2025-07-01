import { z } from 'zod';

export const createSoilTranslationSchema = z.object({
  soilId: z.string().uuid(),
  lang: z.enum(['pl', 'en'], {
    errorMap: () => ({ message: 'Lang must be either "pl" or "en"' }),
  }),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  advantages: z.string().optional(),
  disadvantages: z.string().optional(),
});

export type CreateSoilTranslationDto = z.infer<
  typeof createSoilTranslationSchema
>;
