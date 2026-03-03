import { WarningCode, WarningScope } from '../../common/enums/warning.enums';
import { WeatherWarningOrchestratorService } from './weather-warning-orchestrator.service';
import { WarningInstance } from './warning-instance.entity';

describe('WeatherWarningOrchestratorService', () => {
  it('upserts new set and deactivates missing instances', async () => {
    const instances: WarningInstance[] = [
      {
        id: 'old-1',
        user: { id: 'user-1' } as never,
        dedupeKey: 'user:user-1:code:OLD',
        isActive: true,
        code: WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
      } as unknown as WarningInstance,
    ];

    const em = {
      findOne: jest.fn((entity: unknown, where: Record<string, unknown>) => {
        if (where.id === 'user-1') return { id: 'user-1' };
        if (where.user === 'user-1' && where.dedupeKey) {
          return (
            instances.find((item) => item.dedupeKey === where.dedupeKey) ?? null
          );
        }
        return null;
      }),
      find: jest.fn((entity: unknown, where: Record<string, unknown>) => {
        if (where.user === 'user-1' && where.isActive === true) {
          return instances.filter((item) => item.isActive);
        }
        return [];
      }),
      getReference: jest.fn((cls: unknown, id: string) => ({ id })),
      transactional: jest.fn((cb: (arg: unknown) => Promise<void>) => cb(em)),
      persist: jest.fn((entity: WarningInstance) => {
        if (!entity.id) {
          entity.id = `new-${instances.length + 1}`;
          instances.push(entity);
        }
      }),
      flush: jest.fn(() => Promise.resolve(undefined)),
    };

    const weatherService = {
      tryEnsureWeatherBasis: jest.fn().mockResolvedValue('FRESH'),
    };

    const makeEvaluator = (items: unknown[]) => ({
      evaluate: jest.fn().mockResolvedValue(items),
    });

    const service = new WeatherWarningOrchestratorService(
      em as never,
      weatherService as never,
      makeEvaluator([
        {
          scope: WarningScope.USER,
          code: WarningCode.FROST_RISK_NEXT_7_DAYS,
          values: { thresholdC: 0, minTempC: -1, riskDate: '2026-03-01' },
          validFrom: new Date('2026-02-26T10:00:00.000Z'),
          validTo: new Date('2026-03-01T23:59:59.000Z'),
          weatherBasis: 'FRESH',
          dedupeKey: 'user:user-1:code:FROST_RISK_NEXT_7_DAYS',
        },
      ]) as never,
      makeEvaluator([]) as never,
      makeEvaluator([]) as never,
      makeEvaluator([]) as never,
      makeEvaluator([]) as never,
    );

    await service.recomputeForUser('user-1');

    expect(
      instances.some(
        (item) =>
          item.dedupeKey === 'user:user-1:code:FROST_RISK_NEXT_7_DAYS' &&
          item.isActive,
      ),
    ).toBe(true);
    expect(
      instances.some(
        (item) => item.dedupeKey === 'user:user-1:code:OLD' && !item.isActive,
      ),
    ).toBe(true);
  });
});
