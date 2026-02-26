import {
  IsArray,
  IsBoolean,
  IsISO8601,
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
}

export class TasksResponseDto {
  @IsISO8601()
  computedAt!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  items!: TaskDto[];
}
