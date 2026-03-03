import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ActionTaskSource,
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../../common/enums/action.enums';
import { WarningCode, WarningScope } from '../../common/enums/warning.enums';

export class TaskMetaDto {
  @IsEnum(WarningScope)
  scope!: WarningScope;

  @IsBoolean()
  affectsAllBeds!: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedBedIds?: string[];

  @IsOptional()
  @IsInt()
  affectedBedsCount?: number;

  @IsOptional()
  @IsString()
  locationLabel?: string | null;

  @IsOptional()
  @IsEnum(WarningCode)
  warningCode?: WarningCode;
}

export class TaskDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;

  @IsString()
  status!: ActionTaskStatus;

  @IsString()
  source!: ActionTaskSource;

  @IsString()
  targetType!: ActionTaskTargetType;

  @IsOptional()
  @IsString()
  plantingId?: string | null;

  @IsOptional()
  @IsString()
  bedId?: string | null;

  @IsBoolean()
  isManuallyRescheduled!: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TaskMetaDto)
  meta?: TaskMetaDto | null;
}

export class TasksResponseDto {
  @IsISO8601()
  computedAt!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  items!: TaskDto[];
}
