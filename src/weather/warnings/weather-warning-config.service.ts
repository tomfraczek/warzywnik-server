import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { z } from 'zod';
import { WarningCode } from '../../common/enums/warning.enums';
import { WeatherWarningConfig } from './weather-warning-config.entity';

const DEFAULT_CONFIG: Partial<Record<WarningCode, Record<string, unknown>>> = {
  [WarningCode.SOIL_NOT_RECOMMENDED]: {},
  [WarningCode.PH_OUT_OF_RANGE]: {},
  [WarningCode.DEPTH_TOO_SMALL]: {},
  [WarningCode.NPK_TOO_LOW]: {},
  [WarningCode.ROTATION_RISK]: {},
  [WarningCode.WATER_RETENTION_MISMATCH]: {},
  [WarningCode.DRAINAGE_MISMATCH]: {},
  [WarningCode.FAMILY_REPETITION]: {},
  [WarningCode.HARVEST_WINDOW_MISSED]: {},
  [WarningCode.SUBOPTIMAL_SOWING_TIME]: {},
  [WarningCode.EXPERIMENTAL_SETUP]: {},
  [WarningCode.FROST_RISK_NEXT_7_DAYS]: { tempMinThresholdC: 0 },
  [WarningCode.HARD_FROST_RISK_NEXT_7_DAYS]: { tempMinThresholdC: -5 },
  [WarningCode.DROUGHT_RISK_NEXT_7_DAYS]: {
    precipSumThresholdMm7d: 7,
    considerTempWind: false,
  },
  [WarningCode.HEAVY_RAIN_RISK_NEXT_48H]: {
    precipSumThresholdMm48h: 25,
    precipHourlyPeakThresholdMm: 8,
  },
  [WarningCode.WIND_DAMAGE_RISK_NEXT_48H]: { windMaxThresholdKmh: 55 },
  [WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH]: {
    precipSumThresholdMm48h: 10,
    tempMinC: 10,
    tempMaxC: 24,
  },
  [WarningCode.OVERWATERING_RISK]: {
    precipSumThresholdMm48h: 20,
    drainageLowValues: ['poor'],
  },
  [WarningCode.GERMINATION_TOO_COLD]: {
    germinationMinTempC: 8,
    windowHours: 48,
  },
  [WarningCode.FROST_RISK_TODAY_NIGHT]: {
    frostThresholdC: 0,
    hardFrostThresholdC: -5,
    heavyRainWindowThresholdMm: 12,
    heavyRainPeakThresholdMm: 7,
    windThresholdKmh: 55,
    wateringDailyPrecipMaxMm: 2,
    wateringHighTempC: 24,
    wateringHighWindKmh: 32,
    overwateringPrecipMm: 20,
    germinationMinTempC: 8,
  },
  [WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT]: {
    frostThresholdC: 0,
    hardFrostThresholdC: -5,
    heatWaveThresholdC: 32,
    strongWindThresholdKmh: 45,
    heavyRainThresholdMm: 12,
    stormWindThresholdKmh: 60,
    stormRainThresholdMm: 4,
    snowLoadThresholdMm: 4,
    wetSnowThresholdMm: 1,
    suddenTempDropThresholdC: 10,
  },
};

const SCHEMAS: Partial<
  Record<WarningCode, z.ZodSchema<Record<string, unknown>>>
> = {
  [WarningCode.FROST_RISK_NEXT_7_DAYS]: z.object({
    tempMinThresholdC: z.number(),
  }),
  [WarningCode.HARD_FROST_RISK_NEXT_7_DAYS]: z.object({
    tempMinThresholdC: z.number(),
  }),
  [WarningCode.DROUGHT_RISK_NEXT_7_DAYS]: z.object({
    precipSumThresholdMm7d: z.number().nonnegative(),
    considerTempWind: z.boolean().optional().default(false),
  }),
  [WarningCode.HEAVY_RAIN_RISK_NEXT_48H]: z.object({
    precipSumThresholdMm48h: z.number().nonnegative(),
    precipHourlyPeakThresholdMm: z.number().nonnegative(),
  }),
  [WarningCode.WIND_DAMAGE_RISK_NEXT_48H]: z.object({
    windMaxThresholdKmh: z.number().nonnegative(),
  }),
  [WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH]: z.object({
    precipSumThresholdMm48h: z.number().nonnegative(),
    tempMinC: z.number(),
    tempMaxC: z.number(),
  }),
  [WarningCode.OVERWATERING_RISK]: z.object({
    precipSumThresholdMm48h: z.number().nonnegative(),
    drainageLowValues: z.array(z.string()).default(['poor']),
  }),
  [WarningCode.GERMINATION_TOO_COLD]: z.object({
    germinationMinTempC: z.number(),
    windowHours: z.number().int().positive(),
  }),
  [WarningCode.FROST_RISK_TODAY_NIGHT]: z.object({
    frostThresholdC: z.number(),
    hardFrostThresholdC: z.number(),
    heavyRainWindowThresholdMm: z.number().nonnegative(),
    heavyRainPeakThresholdMm: z.number().nonnegative(),
    windThresholdKmh: z.number().nonnegative(),
    wateringDailyPrecipMaxMm: z.number().nonnegative(),
    wateringHighTempC: z.number(),
    wateringHighWindKmh: z.number().nonnegative(),
    overwateringPrecipMm: z.number().nonnegative(),
    germinationMinTempC: z.number(),
  }),
  [WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT]: z.object({
    frostThresholdC: z.number(),
    hardFrostThresholdC: z.number(),
    heatWaveThresholdC: z.number(),
    strongWindThresholdKmh: z.number().nonnegative(),
    heavyRainThresholdMm: z.number().nonnegative(),
    stormWindThresholdKmh: z.number().nonnegative(),
    stormRainThresholdMm: z.number().nonnegative(),
    snowLoadThresholdMm: z.number().nonnegative(),
    wetSnowThresholdMm: z.number().nonnegative(),
    suddenTempDropThresholdC: z.number().nonnegative(),
  }),
};

@Injectable()
export class WeatherWarningConfigService {
  private readonly logger = new Logger(WeatherWarningConfigService.name);

  constructor(private readonly em: EntityManager) {}

  async getParams<T extends Record<string, unknown>>(
    code: WarningCode,
  ): Promise<T> {
    const fallback = (DEFAULT_CONFIG[code] ?? {}) as T;
    const row = await this.em.findOne(WeatherWarningConfig, {
      code,
      isActive: true,
    });

    if (!row) return fallback;

    const schema = SCHEMAS[code];
    if (!schema) return (row.params as T) ?? fallback;

    const result = schema.safeParse(row.params ?? {});
    if (!result.success) {
      this.logger.warn(
        `invalid weather warning config for code=${code}, using defaults`,
      );
      return fallback;
    }

    return result.data as T;
  }

  getDefaultConfigEntries(): Array<{
    code: WarningCode;
    params: Record<string, unknown>;
  }> {
    return Object.entries(DEFAULT_CONFIG).map(([code, params]) => ({
      code: code as WarningCode,
      params,
    }));
  }
}
