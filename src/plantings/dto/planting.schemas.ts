import { z } from 'zod';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../../common/enums/planting.enums';

export type PlantingBaseDto = {
  bedId?: string;
  vegetableId?: string;
  plannedStartDate?: string;
  actualStartDate?: string | null;
  startMethod?: PlantingStartMethod;
  sowedAt?: string | null;
  transplantedAt?: string | null;
  harvestWindowStart?: string | null;
  harvestWindowEnd?: string | null;
  timelineTimezone?: string;
  status?: PlantingStatus;
  notes?: string | null;
};

export type CreatePlantingDto = PlantingBaseDto & {
  bedId: string;
  vegetableId: string;
  plannedStartDate: string;
};

export type UpdatePlantingDto = PlantingBaseDto;

export type ListPlantingsQueryDto = {
  page: number;
  limit: number;
  bedId?: string;
  status?: PlantingStatus;
  fromDate?: string;
  toDate?: string;
  includeWarnings?: boolean;
};

export type GetPlantingQueryDto = {
  includeWarnings?: boolean;
};

export type RecomputePlantingActionsDto = {
  forceOverrideManual?: boolean;
  useLatestRules?: boolean;
};

const isoDateSchema = z.string().datetime();

const basePlantingSchema = z.object({
  bedId: z.string().uuid().optional(),
  vegetableId: z.string().uuid().optional(),
  plannedStartDate: isoDateSchema.optional(),
  actualStartDate: isoDateSchema.nullable().optional(),
  startMethod: z.nativeEnum(PlantingStartMethod).optional(),
  sowedAt: isoDateSchema.nullable().optional(),
  transplantedAt: isoDateSchema.nullable().optional(),
  harvestWindowStart: isoDateSchema.nullable().optional(),
  harvestWindowEnd: isoDateSchema.nullable().optional(),
  timelineTimezone: z.string().min(1).max(64).optional(),
  status: z.nativeEnum(PlantingStatus).optional(),
  notes: z.string().min(1).nullable().optional(),
});

export const createPlantingSchema = basePlantingSchema.extend({
  bedId: basePlantingSchema.shape.bedId.unwrap(),
  vegetableId: basePlantingSchema.shape.vegetableId.unwrap(),
  plannedStartDate: basePlantingSchema.shape.plannedStartDate.unwrap(),
});

export const updatePlantingSchema = basePlantingSchema;

const validateTimeline = (
  value: z.infer<typeof basePlantingSchema>,
  ctx: z.RefinementCtx,
) => {
  const startMethod = value.startMethod;

  if (startMethod === PlantingStartMethod.DIRECT_SOW && !value.sowedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'sowedAt is required for DIRECT_SOW',
      path: ['sowedAt'],
    });
  }

  if (
    startMethod === PlantingStartMethod.DIRECT_SOW &&
    value.transplantedAt !== undefined &&
    value.transplantedAt !== null
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'transplantedAt must be null for DIRECT_SOW',
      path: ['transplantedAt'],
    });
  }

  if (startMethod === PlantingStartMethod.TRANSPLANT && !value.transplantedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'transplantedAt is required for TRANSPLANT',
      path: ['transplantedAt'],
    });
  }

  if (value.harvestWindowStart && value.harvestWindowEnd) {
    const start = new Date(value.harvestWindowStart);
    const end = new Date(value.harvestWindowEnd);
    if (start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'harvestWindowStart must be <= harvestWindowEnd',
        path: ['harvestWindowStart'],
      });
    }
  }
};

export const createPlantingTimelineSchema =
  createPlantingSchema.superRefine(validateTimeline);

export const updatePlantingTimelineSchema =
  updatePlantingSchema.superRefine(validateTimeline);

export const listPlantingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  bedId: z.string().uuid().optional(),
  status: z.nativeEnum(PlantingStatus).optional(),
  fromDate: isoDateSchema.optional(),
  toDate: isoDateSchema.optional(),
  includeWarnings: z.coerce.boolean().optional().default(false),
});

export const getPlantingQuerySchema = z.object({
  includeWarnings: z.coerce.boolean().optional().default(false),
});

export const recomputePlantingActionsSchema = z.object({
  forceOverrideManual: z.coerce.boolean().optional().default(false),
  useLatestRules: z.coerce.boolean().optional().default(false),
});
