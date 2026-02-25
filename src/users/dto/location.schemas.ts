import { z } from 'zod';

export type UpdateMyLocationDto = {
  mode: 'MANUAL' | 'DEVICE';
  label: string;
  lat: number;
  lon: number;
  providerPlaceId?: string;
  accuracyM?: number;
};

export const updateMyLocationSchema = z
  .object({
    mode: z.enum(['MANUAL', 'DEVICE']),
    label: z.string().trim().min(1).max(255),
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    providerPlaceId: z.string().trim().min(1).max(120).optional(),
    accuracyM: z.coerce.number().min(0).max(10000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.mode === 'DEVICE') {
      if (data.providerPlaceId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['providerPlaceId'],
          message: 'providerPlaceId is allowed only for MANUAL mode',
        });
      }
    }

    if (data.mode === 'MANUAL') {
      if (data.accuracyM !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['accuracyM'],
          message: 'accuracyM is allowed only for DEVICE mode',
        });
      }
    }
  });
