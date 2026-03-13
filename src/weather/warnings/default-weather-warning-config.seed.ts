import { EntityManager } from '@mikro-orm/postgresql';
import { WarningCode } from '../../common/enums/warning.enums';
import { WeatherWarningConfig } from './weather-warning-config.entity';

type WeatherWarningConfigSeedInput = {
  code: string;
  params: Record<string, unknown>;
  isActive: boolean;
  version: number;
};

export const DEFAULT_WEATHER_WARNING_CONFIGS = [
  {
    code: 'HEAVY_RAIN',
    params: {
      rain24hMm: 25,
      rain48hMm: 40,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'STORM_RISK',
    params: {
      thunderstormProbabilityPct: 60,
      windGustKmh: 60,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'HAIL_RISK',
    params: {
      hailProbabilityPct: 35,
      thunderstormProbabilityPct: 70,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'STRONG_WIND',
    params: {
      windSustainedKmh: 40,
      windGustKmh: 55,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'FROST_RISK',
    params: {
      minTempC: 1,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'HARD_FROST_RISK',
    params: {
      minTempC: -3,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'HEAT_STRESS',
    params: {
      maxTempC: 30,
      heatIndexC: 32,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'SUN_SCORCH_RISK',
    params: {
      maxTempC: 29,
      uvIndex: 7,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'DROUGHT_RISK',
    params: {
      daysWithoutRain: 7,
      rainForecastNext3DaysMm: 3,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'WATERING_NEEDED',
    params: {
      daysWithoutRain: 4,
      maxTempC: 24,
      rainForecastNext2DaysMm: 2,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'OVERWATERING_PREPARE',
    params: {
      rain24hMm: 15,
      rain48hMm: 25,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'OVERWATERING_CHECK',
    params: {
      rainPast48hMm: 30,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'SOWING_PAUSE_TOO_COLD',
    params: {
      minTempC: 4,
      maxTempC: 10,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GERMINATION_PROTECT_TOO_COLD',
    params: {
      minTempC: 3,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'TRANSPLANT_DELAY_TOO_COLD',
    params: {
      minTempC: 6,
      maxTempC: 14,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'MULCH_RECOMMENDED_HOT_WEATHER',
    params: {
      maxTempC: 28,
      daysWithoutRain: 3,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'DISEASE_HUMIDITY_RISK_OUTDOOR',
    params: {
      relativeHumidityPct: 85,
      leafWetnessHours: 8,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'LATE_BLIGHT_WEATHER_RISK',
    params: {
      minTempC: 10,
      maxTempC: 22,
      relativeHumidityPct: 85,
      leafWetnessHours: 10,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'DOWNY_MILDEW_WEATHER_RISK',
    params: {
      minTempC: 8,
      maxTempC: 22,
      relativeHumidityPct: 85,
      leafWetnessHours: 8,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'POWDERY_MILDEW_WEATHER_RISK',
    params: {
      minTempC: 16,
      maxTempC: 28,
      relativeHumidityPct: 70,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'SLUG_ACTIVITY_HIGH',
    params: {
      relativeHumidityPct: 85,
      rainPast24hMm: 5,
      nightTempMinC: 6,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'APHID_PRESSURE_WEATHER',
    params: {
      minTempC: 12,
      maxTempC: 26,
      windSustainedKmh: 20,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'CATERPILLAR_ACTIVITY_RISK',
    params: {
      minTempC: 14,
      maxTempC: 28,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_HEAT_STRESS',
    params: {
      outsideMaxTempC: 27,
      solarRadiationHigh: true,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_VENTILATION_REQUIRED',
    params: {
      outsideMaxTempC: 24,
      relativeHumidityPct: 75,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_SHADE_REQUIRED',
    params: {
      outsideMaxTempC: 28,
      uvIndex: 7,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_NIGHT_FROST_PROTECTION',
    params: {
      outsideMinTempC: 1,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_HARD_FROST_PROTECTION',
    params: {
      outsideMinTempC: -4,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_STRONG_WIND_SECURE',
    params: {
      windGustKmh: 55,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_HEAVY_RAIN_CHECK_DRAINAGE',
    params: {
      rain24hMm: 20,
      rain48hMm: 35,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_HIGH_HUMIDITY_RISK',
    params: {
      relativeHumidityPct: 85,
      hoursAboveThreshold: 6,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_CONDENSATION_RISK',
    params: {
      relativeHumidityPct: 90,
      nightTempDropC: 5,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_DISEASE_PRESSURE',
    params: {
      relativeHumidityPct: 85,
      leafWetnessHours: 8,
      poorVentilation: true,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_WHITEFLY_RISK',
    params: {
      insideTempMinC: 18,
      insideTempMaxC: 30,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_SPIDER_MITE_RISK',
    params: {
      insideTempMinC: 24,
      relativeHumidityPct: 60,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_THRIPS_RISK',
    params: {
      insideTempMinC: 20,
      insideTempMaxC: 30,
      relativeHumidityPct: 70,
    },
    isActive: true,
    version: 1,
  },
  {
    code: 'GREENHOUSE_WATERING_REDUCE_CLOUDY',
    params: {
      cloudCoverPct: 80,
      outsideMaxTempC: 18,
      relativeHumidityPct: 85,
    },
    isActive: true,
    version: 1,
  },
] satisfies WeatherWarningConfigSeedInput[];

export async function upsertDefaultWeatherWarningConfigs(
  em: EntityManager,
): Promise<void> {
  for (const seed of DEFAULT_WEATHER_WARNING_CONFIGS) {
    let row = await em.findOne(WeatherWarningConfig, {
      code: seed.code as WarningCode,
    });

    if (!row) {
      row = new WeatherWarningConfig();
      row.code = seed.code as WarningCode;
    }

    row.code = seed.code as WarningCode;
    row.params = seed.params;
    row.isActive = seed.isActive;
    row.version = seed.version;

    em.persist(row);
  }

  await em.flush();
}
