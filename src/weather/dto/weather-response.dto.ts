import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WeatherLocationDto {
  @IsString()
  label!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lon!: number;
}

export class WeatherTodayDto {
  @IsString()
  date!: string;

  @IsNumber()
  tempMin!: number;

  @IsNumber()
  tempMax!: number;

  @IsNumber()
  precipSum!: number;

  @IsNumber()
  windMax!: number;

  @IsIn([
    'CLEAR',
    'PARTLY_CLOUDY',
    'CLOUDY',
    'FOG',
    'DRIZZLE',
    'RAIN',
    'SNOW',
    'THUNDERSTORM',
    'HAIL',
    'UNKNOWN',
  ])
  weatherType!: string;

  @IsIn([
    'CLEAR',
    'PARTLY_CLOUDY',
    'CLOUDY',
    'FOG',
    'DRIZZLE',
    'RAIN',
    'SNOW',
    'THUNDERSTORM',
    'HAIL',
    'UNKNOWN',
  ])
  type!: string;

  @IsString()
  weatherLabel!: string;

  @IsString()
  label!: string;
}

export class WeatherDailyDto {
  @IsString()
  date!: string;

  @IsNumber()
  tempMin!: number;

  @IsNumber()
  tempMax!: number;

  @IsNumber()
  precipSum!: number;

  @IsNumber()
  windMax!: number;

  @IsIn([
    'CLEAR',
    'PARTLY_CLOUDY',
    'CLOUDY',
    'FOG',
    'DRIZZLE',
    'RAIN',
    'SNOW',
    'THUNDERSTORM',
    'HAIL',
    'UNKNOWN',
  ])
  weatherType!: string;

  @IsIn([
    'CLEAR',
    'PARTLY_CLOUDY',
    'CLOUDY',
    'FOG',
    'DRIZZLE',
    'RAIN',
    'SNOW',
    'THUNDERSTORM',
    'HAIL',
    'UNKNOWN',
  ])
  type!: string;

  @IsString()
  weatherLabel!: string;

  @IsString()
  label!: string;
}

export class WeatherHourlyDto {
  @IsString()
  time!: string;

  @IsNumber()
  temp!: number;

  @IsNumber()
  precip!: number;

  @IsNumber()
  windSpeed!: number;

  @IsNumber()
  rain!: number;

  @IsNumber()
  snow!: number;

  @IsBoolean()
  isDay!: boolean;

  @IsIn([
    'CLEAR',
    'PARTLY_CLOUDY',
    'CLOUDY',
    'FOG',
    'DRIZZLE',
    'RAIN',
    'SNOW',
    'THUNDERSTORM',
    'HAIL',
    'UNKNOWN',
  ])
  weatherType!: string;

  @IsIn([
    'CLEAR',
    'PARTLY_CLOUDY',
    'CLOUDY',
    'FOG',
    'DRIZZLE',
    'RAIN',
    'SNOW',
    'THUNDERSTORM',
    'HAIL',
    'UNKNOWN',
  ])
  type!: string;

  @IsString()
  weatherLabel!: string;

  @IsString()
  label!: string;
}

export class WeatherCurrentDto {
  @IsString()
  time!: string;

  @IsNumber()
  temp!: number;

  @IsNumber()
  precip!: number;

  @IsNumber()
  rain!: number;

  @IsNumber()
  snow!: number;

  @IsNumber()
  windSpeed!: number;

  @IsBoolean()
  isDay!: boolean;

  @IsIn([
    'CLEAR',
    'PARTLY_CLOUDY',
    'CLOUDY',
    'FOG',
    'DRIZZLE',
    'RAIN',
    'SNOW',
    'THUNDERSTORM',
    'HAIL',
    'UNKNOWN',
  ])
  weatherType!: string;

  @IsIn([
    'CLEAR',
    'PARTLY_CLOUDY',
    'CLOUDY',
    'FOG',
    'DRIZZLE',
    'RAIN',
    'SNOW',
    'THUNDERSTORM',
    'HAIL',
    'UNKNOWN',
  ])
  type!: string;

  @IsString()
  weatherLabel!: string;

  @IsString()
  label!: string;
}

export class WeatherUnitsDto {
  @IsString()
  temperature!: string;

  @IsString()
  wind!: string;

  @IsString()
  precipitation!: string;
}

export class WeatherResponseDto {
  @IsISO8601()
  fetchedAt!: string;

  @IsISO8601()
  expiresAt!: string;

  @IsBoolean()
  stale!: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  @ValidateNested()
  @Type(() => WeatherLocationDto)
  location!: WeatherLocationDto;

  @ValidateNested()
  @Type(() => WeatherTodayDto)
  today!: WeatherTodayDto;

  @ValidateNested()
  @Type(() => WeatherCurrentDto)
  current!: WeatherCurrentDto;

  @ValidateNested()
  @Type(() => WeatherUnitsDto)
  units!: WeatherUnitsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeatherHourlyDto)
  hourlyToday!: WeatherHourlyDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeatherDailyDto)
  nextDays!: WeatherDailyDto[];
}
