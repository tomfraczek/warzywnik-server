import { IsString, IsBoolean, IsNumber } from 'class-validator';

export class CreateVegetableDto {
  @IsString()
  imageUrl: string;

  @IsString()
  sowingStartMonth: string;

  @IsString()
  sowingEndMonth: string;

  @IsString()
  harvestStartMonth: string;

  @IsString()
  harvestEndMonth: string;

  @IsNumber()
  sowingDepthCm: number;

  @IsNumber()
  spacingCm: number;

  @IsNumber()
  germinationDays: number;

  @IsBoolean()
  directSow: boolean;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  lang: string;
}
