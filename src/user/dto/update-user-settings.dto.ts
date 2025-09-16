import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsIn(['cm', 'inch'])
  unitLength?: 'cm' | 'inch';

  @IsOptional()
  @IsIn(['m2', 'ft2'])
  unitArea?: 'm2' | 'ft2';

  @IsOptional()
  @IsIn(['pl', 'en'])
  locale?: 'pl' | 'en';

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;
}
