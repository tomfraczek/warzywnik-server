import { z } from 'zod';
import {
  DemandLevel,
  Month,
  SunExposure,
  SowingMethodType,
  VegetableFamily,
  BotanicalFamily,
  NutrientNeeds,
  RotationGroup,
  DominantNutrientDemand,
} from '../../common/enums/vegetable.enums';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
} from '../../common/enums/action.enums';
import { PlantingStartMethod } from '../../common/enums/planting.enums';
import type {
  FertilizationStage,
  SowingMethod,
} from '../../common/types/vegetable.types';

export type VegetableBaseDto = {
  name?: string;
  latinName?: string | null;
  imageUrl?: string | null;
  description?: string;
  sunExposure?: SunExposure | null;
  waterDemand?: DemandLevel | null;

  recommendedSoilIds?: string[];

  nutrientDemand?: DemandLevel | null;
  family?: VegetableFamily;
  botanicalFamily?: BotanicalFamily | null;
  nutrientNeeds?: NutrientNeeds;
  rotationGroup?: RotationGroup;
  minSoilDepthCm?: number | null;
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
  postHarvestActionTemplateIds?: string[];
  actionRules?: VegetableActionRuleDto[];
};

export type VegetableActionRuleDto = {
  id?: string;
  actionTemplateId: string;
  trigger: ActionRuleTrigger;
  offsetDays: number;
  schedule: ActionRuleSchedule;
  everyNDays?: number | null;
  occurrencesLimit?: number | null;
  applyIfStartMethod?: PlantingStartMethod[] | null;
  isEnabled?: boolean;
};

export type CreateVegetableDto = VegetableBaseDto & {
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

const botanicalFamilySchema = z.nativeEnum(BotanicalFamily).nullable();

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

const vegetableActionRuleSchema = z
  .object({
    id: z.string().uuid().optional(),
    actionTemplateId: z.string().uuid(),
    trigger: z.nativeEnum(ActionRuleTrigger),
    offsetDays: z.number().int(),
    schedule: z.nativeEnum(ActionRuleSchedule),
    everyNDays: z.number().int().positive().nullable().optional(),
    occurrencesLimit: z.number().int().positive().nullable().optional(),
    applyIfStartMethod: z
      .array(z.nativeEnum(PlantingStartMethod))
      .nullable()
      .optional(),
    isEnabled: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.schedule === ActionRuleSchedule.EVERY_N_DAYS &&
      !value.everyNDays
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'everyNDays is required for EVERY_N_DAYS schedule',
        path: ['everyNDays'],
      });
    }
  });

const baseVegetableSchema = z
  .object({
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
    botanicalFamily: botanicalFamilySchema.optional(),
    nutrientNeeds: nutrientNeedsSchema.optional(),
    rotationGroup: rotationGroupSchema.optional(),
    minSoilDepthCm: nonNegativeNumber.nullable().optional(),
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
    postHarvestActionTemplateIds: z.array(z.string().uuid()).optional(),
    actionRules: z.array(vegetableActionRuleSchema).optional(),
  })
  .strict();

export const createVegetableSchema = baseVegetableSchema
  .extend({
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
