import { z } from 'zod';

export const geoLangSchema = z.enum(['pl', 'en']);

export type GeoSearchQueryDto = {
  q: string;
  limit: number;
  lang: z.infer<typeof geoLangSchema>;
};

export type GeoReverseQueryDto = {
  lat: number;
  lon: number;
  lang: z.infer<typeof geoLangSchema>;
};

export const geoSearchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(200),
    limit: z.coerce.number().int().min(1).max(10).default(6),
    lang: geoLangSchema.default('pl'),
  })
  .strict();

export const geoReverseQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    lang: geoLangSchema.default('pl'),
  })
  .strict();
