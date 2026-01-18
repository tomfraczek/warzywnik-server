import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { CompanionRelation } from '../../common/enums/vegetable.enums';

export class CreateCompanionRuleDto {
  @IsUUID()
  sourceId!: string;

  @IsUUID()
  targetId!: string;

  @IsEnum(CompanionRelation)
  relation!: CompanionRelation;

  @IsOptional()
  @IsString()
  note?: string;
}
