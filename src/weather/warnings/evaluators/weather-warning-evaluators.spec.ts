import { DrainageLevel } from '../../../common/enums/soil.enums';
import { WarningCode } from '../../../common/enums/warning.enums';
import { CultivationEnvironment } from '../../../common/enums/bed.enums';
import { Bed } from '../../../beds/bed.entity';
import { Planting } from '../../../plantings/planting.entity';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../../../common/enums/planting.enums';
import { User } from '../../../users/user.entity';
import { WeatherWarningConfigService } from '../weather-warning-config.service';
import { DroughtRiskNext7DaysEvaluator } from './drought-risk-next-7-days.evaluator';
import { FrostRiskNext7DaysEvaluator } from './frost-risk-next-7-days.evaluator';
import { FungalDiseasePressureHighEvaluator } from './fungal-disease-pressure-high.evaluator';
import { GerminationTooColdEvaluator } from './germination-too-cold.evaluator';
import { HardFrostRiskNext7DaysEvaluator } from './hard-frost-risk-next-7-days.evaluator';
import { HeavyRainRiskNext48hEvaluator } from './heavy-rain-risk-next-48h.evaluator';
import { OverwateringRiskEvaluator } from './overwatering-risk.evaluator';
import { WindDamageRiskNext48hEvaluator } from './wind-damage-risk-next-48h.evaluator';
import { OperationalWeatherWarningsEvaluator } from './operational-weather-warnings.evaluator';
import { resolveWarningContradictions } from '../weather-warning-guards';

const configService = {
  getParams: jest.fn((code: WarningCode) => {
    switch (code) {
      case WarningCode.FROST_RISK_NEXT_7_DAYS:
        return { tempMinThresholdC: 0 };
      case WarningCode.HARD_FROST_RISK_NEXT_7_DAYS:
        return { tempMinThresholdC: -5 };
      case WarningCode.DROUGHT_RISK_NEXT_7_DAYS:
        return { precipSumThresholdMm7d: 7 };
      case WarningCode.HEAVY_RAIN_RISK_NEXT_48H:
        return { precipSumThresholdMm48h: 25, precipHourlyPeakThresholdMm: 8 };
      case WarningCode.WIND_DAMAGE_RISK_NEXT_48H:
        return { windMaxThresholdKmh: 55 };
      case WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH:
        return { precipSumThresholdMm48h: 10, tempMinC: 10, tempMaxC: 24 };
      case WarningCode.OVERWATERING_RISK:
        return { precipSumThresholdMm48h: 20, drainageLowValues: ['poor'] };
      case WarningCode.GERMINATION_TOO_COLD:
        return { germinationMinTempC: 8, windowHours: 48 };
      case WarningCode.FROST_RISK_TODAY_NIGHT:
        return {
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
        };
      default:
        return {};
    }
  }),
} as unknown as WeatherWarningConfigService;

const buildContext = () => {
  const user = { id: 'user-1' } as User;
  const bed = {
    id: 'bed-1',
    name: 'Bed 1',
    soil: { drainage: DrainageLevel.POOR },
    cultivationEnvironment: CultivationEnvironment.GROUND_OUTDOOR,
  } as unknown as Bed;
  const planting = {
    id: 'planting-1',
    status: PlantingStatus.NEW,
    bed,
    vegetable: { name: 'Carrot' },
    plannedStartDate: new Date(),
  } as unknown as Planting;

  return {
    user,
    beds: [bed],
    plantings: [planting],
    now: new Date('2026-02-26T10:00:00.000Z'),
    weatherBasis: 'FRESH' as const,
    snapshotFetchedAt: new Date('2026-02-26T09:00:00.000Z'),
    snapshotData: {
      timezone: 'Europe/Warsaw',
      current: {
        time: '2026-02-26T10:00',
        temp: 3,
        precip: 0,
        rain: 0,
        snow: 0,
        wind: 20,
        weatherCode: 2,
        isDay: true,
      },
      daily: Array.from({ length: 7 }, (_v, i) => ({
        date: `2026-02-${String(26 + i).padStart(2, '0')}`,
        tempMin: i === 0 ? -2 : 2,
        tempMax: 8,
        precipSum: 0.5,
        windMax: 30,
        weatherCode: 2,
      })),
      hourly: Array.from({ length: 48 }, (_v, i) => ({
        time: `2026-02-26T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
        temp: 12,
        precip: i === 5 ? 9 : 0.3,
        rain: 0,
        snow: 0,
        wind: i === 7 ? 62 : 20,
        weatherCode: 2,
        isDay: true,
      })),
    },
  };
};

describe('Weather warning evaluators', () => {
  it('Frost evaluator emits warning', async () => {
    const evaluator = new FrostRiskNext7DaysEvaluator(configService);
    const out = await evaluator.evaluate(buildContext());
    expect(out[0]?.code).toBe(WarningCode.FROST_RISK_NEXT_7_DAYS);
  });

  it('Hard frost evaluator emits warning', async () => {
    const evaluator = new HardFrostRiskNext7DaysEvaluator(configService);
    const out = await evaluator.evaluate(buildContext());
    expect(out.length).toBe(0);
  });

  it('Drought evaluator emits warning', async () => {
    const evaluator = new DroughtRiskNext7DaysEvaluator(configService);
    const out = await evaluator.evaluate(buildContext());
    expect(out[0]?.code).toBe(WarningCode.DROUGHT_RISK_NEXT_7_DAYS);
  });

  it('Heavy rain evaluator emits warning', async () => {
    const evaluator = new HeavyRainRiskNext48hEvaluator(configService);
    const out = await evaluator.evaluate(buildContext());
    expect(out[0]?.code).toBe(WarningCode.HEAVY_RAIN_RISK_NEXT_48H);
  });

  it('Wind evaluator emits warning', async () => {
    const evaluator = new WindDamageRiskNext48hEvaluator(configService);
    const out = await evaluator.evaluate(buildContext());
    expect(out[0]?.code).toBe(WarningCode.WIND_DAMAGE_RISK_NEXT_48H);
  });

  it('Fungal evaluator emits warning', async () => {
    const evaluator = new FungalDiseasePressureHighEvaluator(configService);
    const out = await evaluator.evaluate(buildContext());
    expect(out[0]?.code).toBe(WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH);
  });

  it('Overwatering evaluator emits warning', async () => {
    const evaluator = new OverwateringRiskEvaluator(configService);
    const out = await evaluator.evaluate(buildContext());
    expect(out[0]?.code).toBe(WarningCode.OVERWATERING_RISK);
  });

  it('Germination evaluator emits warning', async () => {
    const evaluator = new GerminationTooColdEvaluator(configService);
    const ctx = buildContext();
    ctx.snapshotData.hourly[0].temp = 4;
    ctx.plantings = [
      {
        ...ctx.plantings[0],
        status: PlantingStatus.IN_GROUND,
        startMethod: PlantingStartMethod.DIRECT_SOW,
        sowedAt: new Date('2026-02-25T10:00:00.000Z'),
        actualStartDate: new Date('2026-02-25T10:00:00.000Z'),
        transplantedAt: null,
        plannedStartDate: new Date('2026-02-25T10:00:00.000Z'),
      } as unknown as Planting,
    ];
    const out = await evaluator.evaluate(ctx);
    expect(out[0]?.code).toBe(WarningCode.GERMINATION_TOO_COLD);
  });

  it('Operational evaluator classifies day/night deterministically', async () => {
    const evaluator = new OperationalWeatherWarningsEvaluator(configService);
    const ctx = buildContext();
    ctx.snapshotData.timezone = 'Europe/Warsaw';
    ctx.snapshotData.hourly = [
      {
        time: '2026-02-26T02:00:00.000Z',
        temp: -2,
        precip: 0,
        rain: 0,
        snow: 0,
        wind: 10,
        weatherCode: 1,
        isDay: false,
      },
      {
        time: '2026-02-26T10:00:00.000Z',
        temp: 11,
        precip: 0,
        rain: 0,
        snow: 0,
        wind: 12,
        weatherCode: 1,
        isDay: true,
      },
    ];

    const out = await evaluator.evaluate(ctx);
    expect(
      out.some((item) => item.code === WarningCode.FROST_RISK_TODAY_NIGHT),
    ).toBe(true);
    expect(
      out.some((item) => item.code === WarningCode.FROST_RISK_TOMORROW_NIGHT),
    ).toBe(false);
  });

  // Regression: hourly.precipitation may contain nulls (mapped to 0 by toFiniteNumber),
  // while daily.precipSum is always fully populated by Open-Meteo.
  // When hourlyPrecip=0 but dailyPrecipSum=10.5, WATERING_NEEDED must NOT be emitted.
  it('Operational evaluator does NOT emit WATERING_NEEDED_TOMORROW when daily precipSum=10.5 but hourly precip=0 (null scenario)', async () => {
    const evaluator = new OperationalWeatherWarningsEvaluator(configService);
    const ctx = buildContext();
    // now = 2026-05-28 10:00 UTC → local Warsaw date = 2026-05-28 (CEST = UTC+2)
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    // daily[0] = today, daily[1] = tomorrow with 10.5 mm rain
    ctx.snapshotData.daily = [
      {
        date: '2026-05-28',
        tempMin: 14,
        tempMax: 28,
        precipSum: 0,
        windMax: 20,
        weatherCode: 2,
      },
      {
        date: '2026-05-29',
        tempMin: 16,
        tempMax: 29,
        precipSum: 10.5,
        windMax: 22,
        weatherCode: 61,
      },
      {
        date: '2026-05-30',
        tempMin: 12,
        tempMax: 22,
        precipSum: 1,
        windMax: 18,
        weatherCode: 2,
      },
    ];

    // Hourly for today (2026-05-28): normal temp, 0 precip
    const todayHourly = Array.from({ length: 24 }, (_v, i) => ({
      time: `2026-05-28T${String(i).padStart(2, '0')}:00:00.000Z`,
      temp: 26,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 20,
      weatherCode: 2,
      isDay: i >= 4 && i < 20,
    }));

    // Hourly for tomorrow (2026-05-29): hot (28°C, above wateringHighTempC=24) but
    // precip=0 — simulating null→0 conversion that caused the bug.
    // With the fix, dailyPrecipSum=10.5 > wateringDailyPrecipMaxMm=2, so no warning.
    const tomorrowHourly = Array.from({ length: 24 }, (_v, i) => ({
      time: `2026-05-29T${String(i).padStart(2, '0')}:00:00.000Z`,
      temp: 28,
      precip: 0, // nulls from Open-Meteo would be mapped to 0 — this is the bug scenario
      rain: 0,
      snow: 0,
      wind: 20,
      weatherCode: 61,
      isDay: i >= 4 && i < 20,
    }));

    ctx.snapshotData.hourly = [...todayHourly, ...tomorrowHourly];

    const out = await evaluator.evaluate(ctx);
    expect(
      out.some((item) => item.code === WarningCode.WATERING_NEEDED_TOMORROW),
    ).toBe(false);
  });

  // Regression: same daily/hourly mismatch must also prevent false WATERING_NEEDED_TODAY.
  it('Operational evaluator does NOT emit WATERING_NEEDED_TODAY when daily precipSum=8 but hourly precip=0', async () => {
    const evaluator = new OperationalWeatherWarningsEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    ctx.snapshotData.daily = [
      {
        date: '2026-05-28',
        tempMin: 14,
        tempMax: 28,
        precipSum: 8,
        windMax: 20,
        weatherCode: 61,
      },
      {
        date: '2026-05-29',
        tempMin: 12,
        tempMax: 20,
        precipSum: 0,
        windMax: 18,
        weatherCode: 2,
      },
    ];

    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 28,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 20,
      weatherCode: i < 24 ? 61 : 2,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const out = await evaluator.evaluate(ctx);
    expect(
      out.some((item) => item.code === WarningCode.WATERING_NEEDED_TODAY),
    ).toBe(false);
  });

  // Regression: HEAVY_RAIN must be emitted from daily.precipSum when hourly data is
  // null/0. daily.precipSum cannot be split into DAY/NIGHT, so the _DAY variant is used
  // as a conservative all-day signal with dailyFallback=true in details.
  it('Operational evaluator DOES emit HEAVY_RAIN_TOMORROW_DAY when daily precipSum=15 but hourly precip=0 (null scenario)', async () => {
    const evaluator = new OperationalWeatherWarningsEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    // heavyRainWindowThresholdMm = 12 (from configService mock)
    ctx.snapshotData.daily = [
      {
        date: '2026-05-28',
        tempMin: 14,
        tempMax: 22,
        precipSum: 0,
        windMax: 20,
        weatherCode: 2,
      },
      {
        date: '2026-05-29',
        tempMin: 15,
        tempMax: 20,
        precipSum: 15,
        windMax: 25,
        weatherCode: 63,
      },
    ];

    // All hourly precip = 0 — simulating null→0 conversion from Open-Meteo
    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 18,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 20,
      weatherCode: i < 24 ? 2 : 63,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const out = await evaluator.evaluate(ctx);
    const heavyRainWarning = out.find(
      (item) => item.code === WarningCode.HEAVY_RAIN_TOMORROW_DAY,
    );
    expect(heavyRainWarning).toBeDefined();
    expect(heavyRainWarning?.details?.dailyFallback).toBe(true);
    expect(heavyRainWarning?.values?.precipSumMm).toBe(15);
  });

  it('Operational evaluator DOES emit HEAVY_RAIN_TODAY_DAY when daily precipSum=20 but hourly precip=0', async () => {
    const evaluator = new OperationalWeatherWarningsEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    ctx.snapshotData.daily = [
      {
        date: '2026-05-28',
        tempMin: 14,
        tempMax: 20,
        precipSum: 20,
        windMax: 20,
        weatherCode: 63,
      },
      {
        date: '2026-05-29',
        tempMin: 12,
        tempMax: 18,
        precipSum: 0,
        windMax: 18,
        weatherCode: 2,
      },
    ];

    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 18,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 20,
      weatherCode: i < 24 ? 63 : 2,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const out = await evaluator.evaluate(ctx);
    const heavyRainWarning = out.find(
      (item) => item.code === WarningCode.HEAVY_RAIN_TODAY_DAY,
    );
    expect(heavyRainWarning).toBeDefined();
    expect(heavyRainWarning?.details?.dailyFallback).toBe(true);
  });

  it('Operational evaluator does NOT use daily fallback for HEAVY_RAIN when hourly data already produced a warning', async () => {
    const evaluator = new OperationalWeatherWarningsEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    ctx.snapshotData.daily = [
      {
        date: '2026-05-28',
        tempMin: 14,
        tempMax: 20,
        precipSum: 18,
        windMax: 20,
        weatherCode: 63,
      },
      {
        date: '2026-05-29',
        tempMin: 12,
        tempMax: 18,
        precipSum: 0,
        windMax: 18,
        weatherCode: 2,
      },
    ];

    // hourly DAY window has 14mm (above heavyRainWindowThresholdMm=12) → real warning fires
    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 18,
      precip: i < 24 && i % 24 >= 6 && i % 24 < 18 ? 1.2 : 0, // 12h × 1.2mm = 14.4mm in DAY window
      rain: 0,
      snow: 0,
      wind: 20,
      weatherCode: i < 24 ? 63 : 2,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const out = await evaluator.evaluate(ctx);
    const heavyRainWarnings = out.filter(
      (item) => item.code === WarningCode.HEAVY_RAIN_TODAY_DAY,
    );
    // Exactly one warning — the hourly-based one, not a duplicate fallback
    expect(heavyRainWarnings).toHaveLength(1);
    expect(heavyRainWarnings[0]?.details?.dailyFallback).toBeFalsy();
  });

  // ---------------------------------------------------------------------------
  // Contradiction guard: resolveWarningContradictions
  // ---------------------------------------------------------------------------

  // Regression 1: rain all day → no WATERING_NEEDED_TODAY, no DROUGHT_RISK.
  // Both evaluators are run and then the guard is applied, mirroring the
  // orchestrator flow. Heavy rain today must suppress watering and drought.
  it('Guard removes WATERING_NEEDED_TODAY and DROUGHT_RISK_NEXT_7_DAYS when it rained all day (hourly + daily)', async () => {
    const opEval = new OperationalWeatherWarningsEvaluator(configService);
    const droughtEval = new DroughtRiskNext7DaysEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-05-28T10:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    // Today: heavy rain (30mm), next 6 days dry — 7-day sum = 30 + 0.5*6 = 33mm > 7mm.
    // But also test with purely dry forecast to verify guard is the safety net.
    ctx.snapshotData.daily = [
      { date: '2026-05-28', tempMin: 14, tempMax: 26, precipSum: 30, windMax: 20, weatherCode: 63 },
      { date: '2026-05-29', tempMin: 12, tempMax: 22, precipSum: 0.2, windMax: 18, weatherCode: 2 },
      { date: '2026-05-30', tempMin: 11, tempMax: 20, precipSum: 0.2, windMax: 15, weatherCode: 2 },
      { date: '2026-05-31', tempMin: 10, tempMax: 19, precipSum: 0.2, windMax: 14, weatherCode: 2 },
      { date: '2026-06-01', tempMin: 13, tempMax: 22, precipSum: 0.2, windMax: 16, weatherCode: 2 },
      { date: '2026-06-02', tempMin: 14, tempMax: 24, precipSum: 0.2, windMax: 20, weatherCode: 2 },
      { date: '2026-06-03', tempMin: 15, tempMax: 25, precipSum: 0.2, windMax: 18, weatherCode: 2 },
    ];

    // Hourly: 2.5mm/h for all 12 DAY-window hours → DAY sum = 30mm > heavyRainWindowThresholdMm=12
    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 22,
      precip: i < 24 && i % 24 >= 6 && i % 24 < 18 ? 2.5 : 0,
      rain: 0,
      snow: 0,
      wind: 18,
      weatherCode: i < 24 ? 63 : 2,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const combined = [
      ...(await opEval.evaluate(ctx)),
      ...(await droughtEval.evaluate(ctx)),
    ];
    const resolved = resolveWarningContradictions(combined);

    expect(resolved.some((w) => w.code === WarningCode.WATERING_NEEDED_TODAY)).toBe(false);
    expect(resolved.some((w) => w.code === WarningCode.DROUGHT_RISK_NEXT_7_DAYS)).toBe(false);
    // Heavy rain warning must still be present
    expect(resolved.some((w) => w.code === WarningCode.HEAVY_RAIN_TODAY_DAY)).toBe(true);
  });

  // Regression 2: daily precip > 0, hourly precip = 0 → drought evaluator must
  // not emit DROUGHT_RISK when today's daily precipSum pushes 7-day total >= threshold.
  it('Drought evaluator does NOT emit DROUGHT_RISK_NEXT_7_DAYS when daily precipSum[0]=8 and hourly=0', async () => {
    const evaluator = new DroughtRiskNext7DaysEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    // today: 8mm (already above the 7mm threshold on its own)
    ctx.snapshotData.daily = [
      { date: '2026-05-28', tempMin: 14, tempMax: 24, precipSum: 8, windMax: 20, weatherCode: 61 },
      { date: '2026-05-29', tempMin: 12, tempMax: 20, precipSum: 0, windMax: 18, weatherCode: 2 },
      { date: '2026-05-30', tempMin: 11, tempMax: 19, precipSum: 0, windMax: 15, weatherCode: 2 },
      { date: '2026-05-31', tempMin: 10, tempMax: 18, precipSum: 0, windMax: 14, weatherCode: 2 },
      { date: '2026-06-01', tempMin: 13, tempMax: 21, precipSum: 0, windMax: 16, weatherCode: 2 },
      { date: '2026-06-02', tempMin: 14, tempMax: 23, precipSum: 0, windMax: 20, weatherCode: 2 },
      { date: '2026-06-03', tempMin: 15, tempMax: 24, precipSum: 0, windMax: 18, weatherCode: 2 },
    ];
    // Hourly all zeros (null→0 from Open-Meteo)
    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 22,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 18,
      weatherCode: 2,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const out = await evaluator.evaluate(ctx);
    expect(out.some((w) => w.code === WarningCode.DROUGHT_RISK_NEXT_7_DAYS)).toBe(false);
  });

  // Regression 3: forecast shows heavy rain tomorrow → guard blocks WATERING_NEEDED_TOMORROW
  // and DROUGHT_RISK when the two evaluators are combined.
  it('Guard removes WATERING_NEEDED_TOMORROW and DROUGHT_RISK when heavy rain is forecast for tomorrow', async () => {
    const opEval = new OperationalWeatherWarningsEvaluator(configService);
    const droughtEval = new DroughtRiskNext7DaysEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    // Today: dry (0mm), tomorrow: 20mm heavy rain, rest: dry.
    // 7-day sum = 0 + 20 + 0*5 = 20mm > 7mm → drought should already not fire from math alone.
    // But keep this test to also confirm WATERING_NEEDED_TOMORROW is blocked by the guard.
    ctx.snapshotData.daily = [
      { date: '2026-05-28', tempMin: 14, tempMax: 30, precipSum: 0, windMax: 20, weatherCode: 2 },
      { date: '2026-05-29', tempMin: 15, tempMax: 22, precipSum: 20, windMax: 25, weatherCode: 63 },
      { date: '2026-05-30', tempMin: 12, tempMax: 20, precipSum: 0, windMax: 18, weatherCode: 2 },
      { date: '2026-05-31', tempMin: 11, tempMax: 19, precipSum: 0, windMax: 14, weatherCode: 2 },
      { date: '2026-06-01', tempMin: 13, tempMax: 22, precipSum: 0, windMax: 16, weatherCode: 2 },
      { date: '2026-06-02', tempMin: 14, tempMax: 24, precipSum: 0, windMax: 20, weatherCode: 2 },
      { date: '2026-06-03', tempMin: 15, tempMax: 26, precipSum: 0, windMax: 18, weatherCode: 2 },
    ];
    // Today hourly: hot, no rain → triggers WATERING_NEEDED_TODAY from operational evaluator.
    // Tomorrow hourly: zero (null→0), but daily=20mm → triggers HEAVY_RAIN fallback + blocks WATERING_NEEDED_TOMORROW.
    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 30,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 20,
      weatherCode: i < 24 ? 2 : 63,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const combined = [
      ...(await opEval.evaluate(ctx)),
      ...(await droughtEval.evaluate(ctx)),
    ];
    const resolved = resolveWarningContradictions(combined);

    expect(resolved.some((w) => w.code === WarningCode.WATERING_NEEDED_TOMORROW)).toBe(false);
    expect(resolved.some((w) => w.code === WarningCode.DROUGHT_RISK_NEXT_7_DAYS)).toBe(false);
  });

  // Regression 4: multiple consecutive rainy days → 7-day sum exceeds threshold,
  // so DROUGHT_RISK must NOT be emitted even without the guard.
  it('Drought evaluator does NOT emit DROUGHT_RISK_NEXT_7_DAYS when 7-day precipSum exceeds threshold', async () => {
    const evaluator = new DroughtRiskNext7DaysEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    // 4mm/day × 7 days = 28mm > precipSumThresholdMm7d=7
    ctx.snapshotData.daily = Array.from({ length: 7 }, (_v, i) => ({
      date: `2026-05-${String(28 + i).padStart(2, '0')}`,
      tempMin: 12,
      tempMax: 20,
      precipSum: 4,
      windMax: 18,
      weatherCode: 61,
    }));
    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 16,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 18,
      weatherCode: 61,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const out = await evaluator.evaluate(ctx);
    expect(out.some((w) => w.code === WarningCode.DROUGHT_RISK_NEXT_7_DAYS)).toBe(false);
  });

  // Regression 5: no historical rain, no forecast rain → DROUGHT_RISK must be emitted.
  it('Drought evaluator DOES emit DROUGHT_RISK_NEXT_7_DAYS when all precipitation is zero', async () => {
    const evaluator = new DroughtRiskNext7DaysEvaluator(configService);
    const ctx = buildContext();
    ctx.now = new Date('2026-06-01T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    ctx.snapshotData.daily = Array.from({ length: 7 }, (_v, i) => ({
      date: `2026-06-${String(1 + i).padStart(2, '0')}`,
      tempMin: 14,
      tempMax: 30,
      precipSum: 0,
      windMax: 20,
      weatherCode: 1,
    }));
    // Hourly also all zero
    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-06-${i < 24 ? '01' : '02'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 28,
      precip: 0,
      rain: 0,
      snow: 0,
      wind: 18,
      weatherCode: 1,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const out = await evaluator.evaluate(ctx);
    expect(out.some((w) => w.code === WarningCode.DROUGHT_RISK_NEXT_7_DAYS)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // End: contradiction guard regression tests
  // ---------------------------------------------------------------------------

  // Regression: OVERWATERING_PREPARE/CHECK should fire when daily precipSum>=20
  // even if hourly precip=0 (null scenario). The fix uses Math.max(hourly, daily).
  it('Operational evaluator DOES emit OVERWATERING warnings when daily precipSum=25 but hourly precip=0', async () => {
    const evaluator = new OperationalWeatherWarningsEvaluator(configService);
    const ctx = buildContext();
    // bed with poor drainage (required for OVERWATERING)
    ctx.beds[0].soil = { drainage: 'poor' } as never;
    ctx.now = new Date('2026-05-28T08:00:00.000Z');
    ctx.snapshotData.timezone = 'Europe/Warsaw';

    ctx.snapshotData.daily = [
      {
        date: '2026-05-28',
        tempMin: 14,
        tempMax: 20,
        precipSum: 0,
        windMax: 18,
        weatherCode: 2,
      },
      {
        date: '2026-05-29',
        tempMin: 12,
        tempMax: 18,
        precipSum: 25,
        windMax: 18,
        weatherCode: 63,
      },
    ];

    ctx.snapshotData.hourly = Array.from({ length: 48 }, (_v, i) => ({
      time: `2026-05-${i < 24 ? '28' : '29'}T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
      temp: 16,
      precip: 0, // hourly nulls → 0
      rain: 0,
      snow: 0,
      wind: 18,
      weatherCode: i < 24 ? 2 : 63,
      isDay: i % 24 >= 4 && i % 24 < 20,
    }));

    const out = await evaluator.evaluate(ctx);
    expect(
      out.some(
        (item) => item.code === WarningCode.OVERWATERING_PREPARE_TOMORROW,
      ),
    ).toBe(true);
  });
});
