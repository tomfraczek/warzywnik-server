import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import {
  DemandLevel,
  DrainageLevel,
  SoilStructure,
  SoilType,
} from '../../common/enums/soil.enums';

const trimArrayItems = (value: unknown): unknown => {
  if (!Array.isArray(value)) {
    return value;
  }

  const items = value as unknown[];
  return items.map((item): unknown =>
    typeof item === 'string' ? item.trim() : item,
  );
};

@ValidatorConstraint({ name: 'trimmedNonEmptyStringArray', async: false })
class TrimmedNonEmptyStringArray implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (!Array.isArray(value)) {
      return false;
    }

    return value.every(
      (item) => typeof item === 'string' && item.trim().length > 0,
    );
  }

  defaultMessage() {
    return 'Each element must be a non-empty string';
  }
}

const IsPhRangeValid =
  (validationOptions?: ValidationOptions) =>
  (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isPhRangeValid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const current = args.object as {
            phMin?: number | null;
            phMax?: number | null;
          };
          if (current.phMin == null || current.phMax == null) {
            return true;
          }

          return current.phMin <= current.phMax;
        },
        defaultMessage() {
          return 'phMin must be less than or equal to phMax';
        },
      },
    });
  };

export class CreateSoilDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsEnum(SoilType)
  soilType!: SoilType;

  @IsEnum(SoilStructure)
  structure!: SoilStructure;

  @IsEnum(DemandLevel)
  waterRetention!: DemandLevel;

  @IsEnum(DrainageLevel)
  drainage!: DrainageLevel;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(14)
  phMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(14)
  @IsPhRangeValid({ message: 'phMin must be less than or equal to phMax' })
  phMax?: number | null;

  @IsEnum(DemandLevel)
  fertilityLevel!: DemandLevel;

  @IsArray()
  @Transform(({ value }) => trimArrayItems(value))
  @Validate(TrimmedNonEmptyStringArray)
  advantages!: string[];

  @IsArray()
  @Transform(({ value }) => trimArrayItems(value))
  @Validate(TrimmedNonEmptyStringArray)
  disadvantages!: string[];

  @IsArray()
  @Transform(({ value }) => trimArrayItems(value))
  @Validate(TrimmedNonEmptyStringArray)
  improvementTips!: string[];
}

export class UpdateSoilDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers and hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsEnum(SoilType)
  soilType?: SoilType;

  @IsOptional()
  @IsEnum(SoilStructure)
  structure?: SoilStructure;

  @IsOptional()
  @IsEnum(DemandLevel)
  waterRetention?: DemandLevel;

  @IsOptional()
  @IsEnum(DrainageLevel)
  drainage?: DrainageLevel;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(14)
  phMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(14)
  @IsPhRangeValid({ message: 'phMin must be less than or equal to phMax' })
  phMax?: number | null;

  @IsOptional()
  @IsEnum(DemandLevel)
  fertilityLevel?: DemandLevel;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => trimArrayItems(value))
  @Validate(TrimmedNonEmptyStringArray)
  advantages?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => trimArrayItems(value))
  @Validate(TrimmedNonEmptyStringArray)
  disadvantages?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => trimArrayItems(value))
  @Validate(TrimmedNonEmptyStringArray)
  improvementTips?: string[];
}

export class ListSoilsQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;
}
