import { z } from 'zod';
import {
  ApplicationMethod,
  EffectLevel,
  FertilizerCategory,
  FertilizerForm,
  NutrientEffect,
  PhEffect,
  RecommendedFrequency,
  RiskLevel,
  SoilStructureEffect,
} from '../../common/enums/fertilizer.enums';

export type FertilizerTypeBaseDto = {
  name?: string;
  description?: string;
  category?: FertilizerCategory;
  form?: FertilizerForm;
  applicationMethod?: ApplicationMethod;
  riskLevel?: RiskLevel;
  nitrogenEffect?: NutrientEffect;
  phosphorusEffect?: NutrientEffect;
  potassiumEffect?: NutrientEffect;
  phEffect?: PhEffect;
  soilStructureEffect?: SoilStructureEffect;
  waterRetentionEffect?: EffectLevel;
  drainageEffect?: EffectLevel;
  recommendedFrequency?: RecommendedFrequency;
  dosageGuidance?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

export type CreateFertilizerTypeDto = FertilizerTypeBaseDto & {
  name: string;
  description: string;
  category: FertilizerCategory;
  form: FertilizerForm;
  applicationMethod: ApplicationMethod;
  riskLevel: RiskLevel;
  nitrogenEffect: NutrientEffect;
  phosphorusEffect: NutrientEffect;
  potassiumEffect: NutrientEffect;
  phEffect: PhEffect;
  soilStructureEffect: SoilStructureEffect;
  waterRetentionEffect: EffectLevel;
  drainageEffect: EffectLevel;
  recommendedFrequency: RecommendedFrequency;
};

export type UpdateFertilizerTypeDto = FertilizerTypeBaseDto;

export type DeleteFertilizerTypesBulkDto = {
  ids: string[];
};

export type ListFertilizerTypesQueryDto = {
  page: number;
  limit: number;
  q?: string;
  category?: FertilizerCategory;
  isActive?: boolean;
};

const nameSchema = z.string().min(2).max(120);
const descriptionSchema = z.string().min(1);

const baseFertilizerTypeSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  category: z.nativeEnum(FertilizerCategory).optional(),
  form: z.nativeEnum(FertilizerForm).optional(),
  applicationMethod: z.nativeEnum(ApplicationMethod).optional(),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  nitrogenEffect: z.nativeEnum(NutrientEffect).optional(),
  phosphorusEffect: z.nativeEnum(NutrientEffect).optional(),
  potassiumEffect: z.nativeEnum(NutrientEffect).optional(),
  phEffect: z.nativeEnum(PhEffect).optional(),
  soilStructureEffect: z.nativeEnum(SoilStructureEffect).optional(),
  waterRetentionEffect: z.nativeEnum(EffectLevel).optional(),
  drainageEffect: z.nativeEnum(EffectLevel).optional(),
  recommendedFrequency: z.nativeEnum(RecommendedFrequency).optional(),
  dosageGuidance: z.string().min(1).nullable().optional(),
  notes: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createFertilizerTypeSchema = baseFertilizerTypeSchema.extend({
  name: baseFertilizerTypeSchema.shape.name.unwrap(),
  description: baseFertilizerTypeSchema.shape.description.unwrap(),
  category: baseFertilizerTypeSchema.shape.category.unwrap(),
  form: baseFertilizerTypeSchema.shape.form.unwrap(),
  applicationMethod: baseFertilizerTypeSchema.shape.applicationMethod.unwrap(),
  riskLevel: baseFertilizerTypeSchema.shape.riskLevel.unwrap(),
  nitrogenEffect: baseFertilizerTypeSchema.shape.nitrogenEffect.unwrap(),
  phosphorusEffect: baseFertilizerTypeSchema.shape.phosphorusEffect.unwrap(),
  potassiumEffect: baseFertilizerTypeSchema.shape.potassiumEffect.unwrap(),
  phEffect: baseFertilizerTypeSchema.shape.phEffect.unwrap(),
  soilStructureEffect:
    baseFertilizerTypeSchema.shape.soilStructureEffect.unwrap(),
  waterRetentionEffect:
    baseFertilizerTypeSchema.shape.waterRetentionEffect.unwrap(),
  drainageEffect: baseFertilizerTypeSchema.shape.drainageEffect.unwrap(),
  recommendedFrequency:
    baseFertilizerTypeSchema.shape.recommendedFrequency.unwrap(),
});

export const updateFertilizerTypeSchema = baseFertilizerTypeSchema;

export const deleteFertilizerTypesBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const listFertilizerTypesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
  category: z.nativeEnum(FertilizerCategory).optional(),
  isActive: z.coerce.boolean().optional(),
});
