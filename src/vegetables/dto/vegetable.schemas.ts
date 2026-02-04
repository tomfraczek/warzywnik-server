import { z } from 'zod';
import {
  DemandLevel,
  Month,
  SunExposure,
  SowingMethodType,
  VegetableFamily,
  NutrientNeeds,
  RotationGroup,
  DominantNutrientDemand,
} from '../../common/enums/vegetable.enums';
import type {
  FertilizationStage,
  SowingMethod,
} from '../../common/types/vegetable.types';

export type VegetableBaseDto = {
  slug?: string;
  name?: string;
  latinName?: string | null;
  imageUrl?: string | null;
  description?: string;
  sunExposure?: SunExposure | null;
  waterDemand?: DemandLevel | null;

  recommendedSoilIds?: string[];

  nutrientDemand?: DemandLevel | null;
  family?: VegetableFamily;
  nutrientNeeds?: NutrientNeeds;
  rotationGroup?: RotationGroup;
  minSoilDepthCm?: number | null;
  requiredSoilDepthCm?: number | null;
  dominantNutrientDemand?: DominantNutrientDemand | null;
  sowingMethods?: SowingMethod[];
  timeToHarvestDaysMin?: number | null;
  timeToHarvestDaysMax?: number | null;
  successionSowing?: boolean;
  successionIntervalDays?: number | null;
  harvestStartMonth?: Month | null;
  harvestEndMonth?: Month | null;
  harvestSigns?: string | null;
  fertilizationStages?: FertilizationStage[];
  commonPestIds?: string[];
  commonDiseaseIds?: string[];
  goodCompanionIds?: string[];
  badCompanionIds?: string[];
};

export type CreateVegetableDto = VegetableBaseDto & {
  slug: string;
  name: string;
  description: string;
};

export type UpdateVegetableDto = VegetableBaseDto;

export type ListVegetablesQueryDto = {
  page: number;
  limit: number;
  q?: string;
  sunExposure?: SunExposure;
  waterDemand?: DemandLevel;
  nutrientDemand?: DemandLevel;
};

const monthSchema = z.nativeEnum(Month);
const demandLevelSchema = z.nativeEnum(DemandLevel);
const sunExposureSchema = z.nativeEnum(SunExposure);
const sowingMethodTypeSchema = z.nativeEnum(SowingMethodType);

// ✅ no manual arrays + no "as VegetableFamily" casts
const vegetableFamilySchema = z
  .nativeEnum(VegetableFamily)
  .default(VegetableFamily.OTHER);

const nutrientNeedsSchema = z
  .nativeEnum(NutrientNeeds)
  .default(NutrientNeeds.MEDIUM);

const rotationGroupSchema = z
  .nativeEnum(RotationGroup)
  .default(RotationGroup.OTHER);

const dominantNutrientDemandSchema = z
  .nativeEnum(DominantNutrientDemand)
  .nullable();

const nonNegativeNumber = z.number().min(0, 'Must be >= 0');
const positiveInt = z.number().int().min(1, 'Must be >= 1');
const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens');
const nameSchema = z.string().min(2).max(120);
const descriptionSchema = z.string().min(1);

const sowingMethodSchema = z
  .object({
    method: sowingMethodTypeSchema,
    startMonth: monthSchema,
    endMonth: monthSchema,
    underCover: z.boolean(),
    germinationDaysMin: nonNegativeNumber.nullable(),
    germinationDaysMax: nonNegativeNumber.nullable(),
    seedDepthCm: nonNegativeNumber.nullable(),
    rowSpacingCm: nonNegativeNumber.nullable(),
    plantSpacingCm: nonNegativeNumber.nullable(),
    transplantingStartMonth: monthSchema.nullable(),
    transplantingEndMonth: monthSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.germinationDaysMin === null &&
      value.germinationDaysMax === null
    ) {
      return;
    }
    if (
      value.germinationDaysMin === null ||
      value.germinationDaysMax === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'germinationDaysMin and germinationDaysMax must be provided together',
        path: ['germinationDaysMin'],
      });
      return;
    }
    if (value.germinationDaysMin > value.germinationDaysMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'germinationDaysMin must be <= germinationDaysMax',
        path: ['germinationDaysMin'],
      });
    }
  });

const fertilizationStageSchema = z.object({
  name: z.string().min(1).max(120),
  timing: z.string().max(255).nullable(),
  description: z.string().min(1),
});

const baseVegetableSchema = z
  .object({
    slug: slugSchema.optional(),
    name: nameSchema.optional(),
    latinName: z.string().max(160).nullable().optional(),
    imageUrl: z.string().max(255).nullable().optional(),
    description: descriptionSchema.optional(),
    sunExposure: sunExposureSchema.nullable().optional(),
    waterDemand: demandLevelSchema.nullable().optional(),

    recommendedSoilIds: z.array(z.string().uuid()).optional(),

    nutrientDemand: demandLevelSchema.nullable().optional(),

    // defaults are defined on schema level -> no casts needed
    family: vegetableFamilySchema.optional(),
    nutrientNeeds: nutrientNeedsSchema.optional(),
    rotationGroup: rotationGroupSchema.optional(),
    minSoilDepthCm: nonNegativeNumber.nullable().optional(),
    requiredSoilDepthCm: positiveInt.nullable().optional(),
    dominantNutrientDemand: dominantNutrientDemandSchema.optional(),

    sowingMethods: z.array(sowingMethodSchema).optional(),
    timeToHarvestDaysMin: nonNegativeNumber.nullable().optional(),
    timeToHarvestDaysMax: nonNegativeNumber.nullable().optional(),
    successionSowing: z.boolean().optional(),
    successionIntervalDays: nonNegativeNumber.nullable().optional(),
    harvestStartMonth: monthSchema.nullable().optional(),
    harvestEndMonth: monthSchema.nullable().optional(),
    harvestSigns: z.string().min(1).nullable().optional(),
    fertilizationStages: z.array(fertilizationStageSchema).optional(),
    commonPestIds: z.array(z.string().uuid()).optional(),
    commonDiseaseIds: z.array(z.string().uuid()).optional(),
    goodCompanionIds: z.array(z.string().uuid()).optional(),
    badCompanionIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

export const createVegetableSchema = baseVegetableSchema
  .extend({
    slug: slugSchema,
    name: nameSchema,
    description: descriptionSchema,
  })
  .superRefine((value, ctx) => {
    if (
      value.timeToHarvestDaysMin == null &&
      value.timeToHarvestDaysMax == null
    ) {
      // ok
    } else if (
      value.timeToHarvestDaysMin == null ||
      value.timeToHarvestDaysMax == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'timeToHarvestDaysMin and timeToHarvestDaysMax must be provided together',
        path: ['timeToHarvestDaysMin'],
      });
    } else if (value.timeToHarvestDaysMin > value.timeToHarvestDaysMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeToHarvestDaysMin must be <= timeToHarvestDaysMax',
        path: ['timeToHarvestDaysMin'],
      });
    }

    if (value.successionSowing && value.successionIntervalDays == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'successionIntervalDays is required when successionSowing is true',
        path: ['successionIntervalDays'],
      });
    }
  });

export const updateVegetableSchema = baseVegetableSchema.superRefine(
  (value, ctx) => {
    if (
      value.timeToHarvestDaysMin == null &&
      value.timeToHarvestDaysMax == null
    ) {
      // ok
    } else if (
      value.timeToHarvestDaysMin == null ||
      value.timeToHarvestDaysMax == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'timeToHarvestDaysMin and timeToHarvestDaysMax must be provided together',
        path: ['timeToHarvestDaysMin'],
      });
    } else if (value.timeToHarvestDaysMin > value.timeToHarvestDaysMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'timeToHarvestDaysMin must be <= timeToHarvestDaysMax',
        path: ['timeToHarvestDaysMin'],
      });
    }

    if (
      value.successionSowing === true &&
      value.successionIntervalDays == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'successionIntervalDays is required when successionSowing is true',
        path: ['successionIntervalDays'],
      });
    }
  },
);

export const listVegetablesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
  sunExposure: sunExposureSchema.optional(),
  waterDemand: demandLevelSchema.optional(),
  nutrientDemand: demandLevelSchema.optional(),
  family: vegetableFamilySchema.optional(),
  nutrientNeeds: nutrientNeedsSchema.optional(),
  rotationGroup: rotationGroupSchema.optional(),
});
