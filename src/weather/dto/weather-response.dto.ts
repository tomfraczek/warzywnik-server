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

export const WEATHER_STATUS_SEVERITIES = [
  'ok',
  'info',
  'warning',
  'danger',
] as const;

export const WEATHER_STATUS_SOURCES = ['hourly_forecast', 'warnings'] as const;

export type WeatherStatusSeverity = (typeof WEATHER_STATUS_SEVERITIES)[number];
export type WeatherStatusSource = (typeof WEATHER_STATUS_SOURCES)[number];

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

export class WeatherStatusDto {
  @IsOptional()
  @IsIn(['ok', 'watch', 'warning', 'critical'])
  level?: 'ok' | 'watch' | 'warning' | 'critical';

  @IsIn(WEATHER_STATUS_SEVERITIES)
  severity!: WeatherStatusSeverity;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsString()
  subtitle!: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  validTo?: string | null;

  @IsIn(WEATHER_STATUS_SOURCES)
  source!: WeatherStatusSource;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];
}

export class WeatherStatusDebugHourDto {
  @IsString()
  time!: string;

  @IsString()
  localTime!: string;

  @IsNumber()
  offsetHours!: number;

  @IsBoolean()
  isCurrent!: boolean;

  @IsArray()
  @IsString({ each: true })
  phenomena!: string[];

  @IsNumber()
  precip!: number;

  @IsNumber()
  rain!: number;

  @IsNumber()
  snow!: number;

  @IsNumber()
  windSpeed!: number;

  @IsNumber()
  weatherCode!: number;
}

export class WeatherStatusDebugCandidateDto {
  @IsString()
  code!: string;

  @IsString()
  timing!: string;

  @IsNumber()
  score!: number;

  @IsArray()
  @IsString({ each: true })
  matchedHours!: string[];
}

export class WeatherStatusDebugDto {
  @IsString()
  timezone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeatherStatusDebugHourDto)
  analyzedHours!: WeatherStatusDebugHourDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeatherStatusDebugCandidateDto)
  candidates!: WeatherStatusDebugCandidateDto[];

  @IsString()
  selectedCode!: string;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => WeatherStatusDto)
  status?: WeatherStatusDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeatherStatusDto)
  gardenRiskStatus?: WeatherStatusDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeatherStatusDebugDto)
  statusDebug?: WeatherStatusDebugDto;

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
