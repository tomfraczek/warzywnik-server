import { createVegetableSchema } from './create-vegetable.dto';
import { z } from 'zod';

export const updateVegetableSchema = createVegetableSchema.partial();

export type UpdateVegetableDto = z.infer<typeof updateVegetableSchema>;
