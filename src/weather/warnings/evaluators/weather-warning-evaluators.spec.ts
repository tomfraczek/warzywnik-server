import { DrainageLevel } from '../../../common/enums/soil.enums';
import { WarningCode } from '../../../common/enums/warning.enums';
import { Bed } from '../../../beds/bed.entity';
import { Planting } from '../../../plantings/planting.entity';
import { PlantingStatus } from '../../../common/enums/planting.enums';
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
  } as unknown as Bed;
  const planting = {
    id: 'planting-1',
    status: PlantingStatus.PLANNED,
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
    const out = await evaluator.evaluate(ctx);
    expect(out[0]?.code).toBe(WarningCode.GERMINATION_TOO_COLD);
  });
});
