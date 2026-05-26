import { z } from 'zod';

export const createVegetableSuggestionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  note: z.string().max(500).optional(),
});

export const listAdminVegetableSuggestionsQuerySchema = z.object({
  search: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateVegetableSuggestionDto = z.infer<
  typeof createVegetableSuggestionSchema
>;
export type ListAdminVegetableSuggestionsQueryDto = z.infer<
  typeof listAdminVegetableSuggestionsQuerySchema
>;
