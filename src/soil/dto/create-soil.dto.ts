import { z } from 'zod';

export const createSoilSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  advantages: z.array(z.string()).optional(),
  disadvantages: z.array(z.string()).optional(),
});
