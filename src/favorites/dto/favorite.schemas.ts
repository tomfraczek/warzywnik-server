import { z } from 'zod';
import { FavoriteTargetType } from '../../common/enums/favorite.enums';

const targetSlugSchema = z.string().trim().min(1).max(180);
const includeSchema = z.enum(['details']);

export const addFavoriteSchema = z.object({
  targetType: z.nativeEnum(FavoriteTargetType),
  targetSlug: targetSlugSchema,
});

export const listFavoritesQuerySchema = z.object({
  targetType: z.nativeEnum(FavoriteTargetType).optional(),
  include: includeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const listGroupedFavoritesQuerySchema = z.object({
  include: includeSchema.optional(),
});

export type AddFavoriteDto = z.infer<typeof addFavoriteSchema>;
export type ListFavoritesQueryDto = z.infer<typeof listFavoritesQuerySchema>;
export type ListGroupedFavoritesQueryDto = z.infer<
  typeof listGroupedFavoritesQuerySchema
>;
