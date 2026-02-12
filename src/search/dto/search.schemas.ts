import { z } from 'zod';

export type SearchQueryDto = {
  q: string;
  types?: string;
  limit: number;
};

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(3),
    types: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .strict();
