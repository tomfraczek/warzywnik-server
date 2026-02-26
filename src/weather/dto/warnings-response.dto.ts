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
import { WarningCode, WarningSeverity } from '../../common/enums/warning.enums';

export class WarningDto {
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
