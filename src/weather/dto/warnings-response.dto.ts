import {
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WarningCode,
  WarningScope,
  WarningSeverity,
} from '../../common/enums/warning.enums';

export class WarningDto {
  @IsString()
  dedupeKey!: string;

  @IsString()
  code!: WarningCode;

  @IsString()
  severity!: WarningSeverity;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  hint?: string | null;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown> | null;

  @IsString()
  scope!: WarningScope;

  @IsOptional()
  @IsString()
  bedId?: string | null;

  @IsOptional()
  @IsString()
  bedName?: string | null;

  @IsOptional()
  @IsString()
  plantingId?: string | null;

  @IsOptional()
  @IsString()
  vegetableName?: string | null;

  @IsOptional()
  @IsString()
  localDate?: string | null;

  @IsOptional()
  @IsIn(['DAY', 'NIGHT', 'ANY'])
  dayPart?: 'DAY' | 'NIGHT' | 'ANY' | null;

  @IsOptional()
  @IsString()
  validFrom?: string | null;

  @IsOptional()
  @IsString()
  validTo?: string | null;
}

export class WarningsResponseDto {
  @IsISO8601()
  computedAt!: string;

  @IsIn(['FRESH', 'STALE', 'NONE'])
  weatherBasis!: 'FRESH' | 'STALE' | 'NONE';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarningDto)
  items!: WarningDto[];
}
