import { z } from 'zod';

export type MediaLibraryQueryDto = {
  limit: number;
  cursor?: string;
};

export const mediaLibraryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).optional(),
  })
  .strict();
