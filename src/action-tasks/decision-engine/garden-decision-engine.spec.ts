import { GardenDecisionEngine } from './garden-decision-engine.service';
import { PlantingDecisionContext } from './decision.types';
import { PlantingStatus } from '../../common/enums/planting.enums';
import { WarningCode } from '../../common/enums/warning.enums';
import { PlantingEventType } from '../../common/enums/planting-event.enums';

describe('GardenDecisionEngine', () => {
  const now = new Date('2026-05-05T08:00:00.000Z');

  const makeContext = (
    overrides: Partial<PlantingDecisionContext> = {},
  ): PlantingDecisionContext =>
    ({
      now,
      planting: {
        id: 'planting-1',
        status: PlantingStatus.IN_GROUND,
        timelineTimezone: 'Europe/Warsaw',
        sowedAt: new Date('2026-04-20T08:00:00.000Z'),
        transplantedAt: null,
        harvestWindowStart: null,
        bed: {
          id: 'bed-1',
          soil: {
            waterRetention: 'medium',
            drainage: 'medium',
          },
        },
        vegetable: {
          waterDemand: 'medium',
          commonPests: [{ id: 'p1' }],
          commonDiseases: [{ id: 'd1' }],
        },
      } as never,
      latestWeatherSnapshot: null,
      activeWarnings: [],
      pendingTasks: [],
      recentlyCanceledTasks: [],
      recentCompletedActionEvents: [],
      recentPrecipMm24h: 0,
      recentPrecipMm72h: 0,
      forecastPrecipMm24h: 0,
      forecastPrecipMm48h: 0,
      forecastMaxTemp24h: 24,
      ...overrides,
    }) as PlantingDecisionContext;

  it('returns no decision when no routine need exists', () => {
    const engine = new GardenDecisionEngine();
    const context = makeContext({
      planting: {
        ...makeContext().planting,
        vegetable: { waterDemand: 'low', commonPests: [], commonDiseases: [] },
      } as never,
      recentPrecipMm24h: 6,
      recentPrecipMm72h: 14,
      forecastPrecipMm48h: 10,
      forecastMaxTemp24h: 20,
    });

    expect(engine.evaluate(context)).toHaveLength(0);
  });

  it('does not generate moisture check when done today', () => {
    const engine = new GardenDecisionEngine();
    const context = makeContext({
      recentCompletedActionEvents: [
        {
          eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
          eventTime: now,
          payload: { decisionType: 'MOISTURE_CHECK' },
        } as never,
      ],
      forecastMaxTemp24h: 31,
    });

    const decisions = engine.evaluate(context);
    expect(
      decisions.some((item) => item.decisionType === 'MOISTURE_CHECK'),
    ).toBe(false);
  });

  it('does not generate watering on high retention soil with forecast rain', () => {
    const engine = new GardenDecisionEngine();
    const context = makeContext({
      planting: {
        ...makeContext().planting,
        vegetable: { waterDemand: 'high', commonPests: [], commonDiseases: [] },
        bed: {
          id: 'bed-1',
          soil: { waterRetention: 'high', drainage: 'poor' },
        },
      } as never,
      forecastPrecipMm48h: 9,
      recentPrecipMm72h: 8,
      forecastMaxTemp24h: 26,
    });

    const decisions = engine.evaluate(context);
    expect(decisions.some((item) => item.decisionType === 'WATERING')).toBe(
      false,
    );
  });

  it('generates watering for high demand in prolonged dry conditions', () => {
    const engine = new GardenDecisionEngine();
    const context = makeContext({
      planting: {
        ...makeContext().planting,
        vegetable: { waterDemand: 'high', commonPests: [], commonDiseases: [] },
      } as never,
      recentPrecipMm24h: 0,
      recentPrecipMm72h: 0,
      forecastPrecipMm48h: 0,
      forecastMaxTemp24h: 32,
      recentCompletedActionEvents: [
        {
          eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
          eventTime: new Date('2026-05-01T08:00:00.000Z'),
          payload: { decisionType: 'WATERING' },
        } as never,
      ],
    });

    const decisions = engine.evaluate(context);
    expect(decisions.some((item) => item.decisionType === 'WATERING')).toBe(
      true,
    );
  });

  it('prefers moisture check when watering confidence is low', () => {
    const engine = new GardenDecisionEngine();
    const context = makeContext({
      planting: {
        ...makeContext().planting,
        vegetable: { waterDemand: 'high', commonPests: [], commonDiseases: [] },
      } as never,
      recentPrecipMm24h: 2,
      recentPrecipMm72h: 6,
      forecastPrecipMm48h: 1,
      forecastMaxTemp24h: 27,
      recentCompletedActionEvents: [],
    });

    const decisions = engine.evaluate(context);
    expect(
      decisions.some((item) => item.decisionType === 'MOISTURE_CHECK'),
    ).toBe(true);
    expect(decisions.some((item) => item.decisionType === 'WATERING')).toBe(
      false,
    );
  });

  it('READY_FOR_FINAL_HARVEST returns harvest check without baseline moisture task', () => {
    const engine = new GardenDecisionEngine();
    const context = makeContext({
      planting: {
        ...makeContext().planting,
        status: PlantingStatus.READY_FOR_FINAL_HARVEST,
      } as never,
      forecastMaxTemp24h: 31,
    });

    const decisions = engine.evaluate(context);
    expect(
      decisions.some((item) => item.decisionType === 'HARVEST_CHECK'),
    ).toBe(true);
    expect(
      decisions.some((item) => item.decisionType === 'MOISTURE_CHECK'),
    ).toBe(false);
  });

  it('final statuses do not produce care tasks', () => {
    const engine = new GardenDecisionEngine();

    const statuses = [
      PlantingStatus.HARVESTED,
      PlantingStatus.CLEARED,
      PlantingStatus.FAILED,
      PlantingStatus.CANCELLED,
    ];

    for (const status of statuses) {
      const context = makeContext({
        planting: {
          ...makeContext().planting,
          status,
        } as never,
      });

      expect(engine.evaluate(context)).toHaveLength(0);
    }
  });

  it('does not duplicate when pending same decision type exists', () => {
    const engine = new GardenDecisionEngine();
    const context = makeContext({
      pendingTasks: [
        {
          planting: { id: 'planting-1' },
          metadata: { decisionType: 'WATERING' },
        } as never,
      ],
      planting: {
        ...makeContext().planting,
        vegetable: { waterDemand: 'high', commonPests: [], commonDiseases: [] },
      } as never,
      forecastMaxTemp24h: 33,
    });

    const decisions = engine.evaluate(context);
    expect(decisions.some((item) => item.decisionType === 'WATERING')).toBe(
      false,
    );
  });

  it('disease check appears only with real risk warning', () => {
    const engine = new GardenDecisionEngine();
    const context = makeContext({
      activeWarnings: [
        {
          code: WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH,
        } as never,
      ],
    });

    const decisions = engine.evaluate(context);
    expect(
      decisions.some((item) => item.decisionType === 'DISEASE_CHECK'),
    ).toBe(true);
  });
});
