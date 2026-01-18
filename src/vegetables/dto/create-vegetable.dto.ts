import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PlantType,
  GrowthForm,
  LifeCycle,
  FrostResistance,
  SunExposure,
  WaterNeeds,
  NutrientNeeds,
  WindowType,
  MediaType,
  CompanionRelation,
  DifficultyLevel,
  HarvestFrequency,
} from '../../common/enums/vegetable.enums';

export class CreateVegetableDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  latinName?: string;

  @IsOptional()
  @IsString()
  family?: string;

  @IsOptional()
  @IsEnum(PlantType)
  plantType?: PlantType;

  @IsOptional()
  @IsEnum(GrowthForm)
  growthForm?: GrowthForm;

  @IsOptional()
  @IsEnum(LifeCycle)
  lifeCycle?: LifeCycle;

  @IsOptional()
  @IsNumber()
  @Min(0)
  daysToHarvest?: number;

  // environment
  @IsOptional()
  @IsNumber()
  minTemp?: number;

  @IsOptional()
  @IsNumber()
  optimalTemp?: number;

  @IsOptional()
  @IsEnum(FrostResistance)
  frostResistance?: FrostResistance;

  @IsOptional()
  @IsEnum(SunExposure)
  sunExposure?: SunExposure;

  @IsOptional()
  @IsEnum(WaterNeeds)
  waterNeeds?: WaterNeeds;

  @IsOptional()
  @IsEnum(NutrientNeeds)
  nutrientNeeds?: NutrientNeeds;

  // sowing/planting
  @IsOptional()
  @IsNumber()
  @Min(0)
  seedDepth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rowSpacing?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plantSpacing?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  germinationTimeDays?: number;

  @IsOptional()
  @IsNumber()
  germinationTempMin?: number;

  @IsOptional()
  @IsBoolean()
  directSow?: boolean;

  @IsOptional()
  @IsBoolean()
  thinningRequired?: boolean;

  // simple lists
  @IsOptional()
  @IsArray()
  commonPests?: string[];

  @IsOptional()
  @IsArray()
  commonDiseases?: string[];

  @IsOptional()
  @IsArray()
  organicTreatments?: string[];

  @IsOptional()
  @IsArray()
  chemicalTreatments?: string[];

  // nutrition
  @IsOptional()
  @IsNumber()
  caloriesPer100g?: number;

  @IsOptional()
  macros?: { protein?: number; fat?: number; carbs?: number; fiber?: number };

  @IsOptional()
  @IsArray()
  vitamins?: string[];

  @IsOptional()
  @IsArray()
  minerals?: string[];

  // education
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  howToGrow?: string;

  @IsOptional()
  @IsArray()
  blogPosts?: string[];

  // metadata
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsNumber()
  spaceEfficiency?: number;

  @IsOptional()
  @IsNumber()
  ecoScore?: number;

  @IsOptional()
  @IsBoolean()
  beeFriendly?: boolean;
}
