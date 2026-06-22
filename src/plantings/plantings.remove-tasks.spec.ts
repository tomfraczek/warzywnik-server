/**
 * PlantingsService — remove() task cleanup.
 *
 * Verifies that removing a planting:
 *   1. Cancels direct PLANTING-scoped tasks (including manual).
 *   2. Removes planting from affectedPlantingIds of related bed/space tasks,
 *      keeping the task active if other plantings remain.
 *   3. Cancels the related task if affectedPlantingIds becomes empty.
 */

import { EntityManager } from '@mikro-orm/postgresql';
import { PlantingsService } from './plantings.service';
import { PlantingStatus } from '../common/enums/planting.enums';
import { EntitlementsService } from '../entitlements/entitlements.service';

const premiumEntitlementsService = {
  isPremium: () => true,
  resolveSource: () => 'subscription',
  getEntitlements: jest.fn(),
  getLimits: jest.fn(),
} as unknown as EntitlementsService;
import {
  ActionTaskOwnerScopeType,
  ActionTaskStatus,
} from '../common/enums/action.enums';
import { ActionAutomationService } from '../action-tasks/action-automation.service';
import { WarningsService } from '../warning-rules/warnings.service';
import { PlantingInsightsService } from '../planting-insights/planting-insights.service';
import { AnalyticsService } from '../analytics/analytics.service';

const USER_ID = 'user-1';
const PLANTING_A = 'planting-A';
const PLANTING_B = 'planting-B';
const BED_ID = 'bed-1';

function makeTask(overrides: Record<string, unknown>) {
  return {
    id: 'task-default',
    status: ActionTaskStatus.PENDING,
    suppressedAt: null,
    metadata: null,
    ...overrides,
  };
}

/**
 * Build a minimal EntityManager mock for remove() tests.
 * directTasks: tasks returned for ownerScopeType=PLANTING query
 * legacyTasks: tasks returned for legacy (planting=X, ownerScopeType=null) query
 * aggregatedTasks: tasks returned for ownerScopeType=BED/SPACE + affectedPlantingIds query
 */
function buildEm(
  planting: Record<string, unknown>,
  {
    directTasks = [] as ReturnType<typeof makeTask>[],
    legacyTasks = [] as ReturnType<typeof makeTask>[],
    aggregatedTasks = [] as ReturnType<typeof makeTask>[],
  } = {},
) {
  let txCallback: ((em: unknown) => Promise<void>) | null = null;

  // Inner transactional EM: captures find calls and mutates tasks
  const txEm = {
    find: jest.fn((_: unknown, where: Record<string, unknown>) => {
      if (where?.ownerScopeType === ActionTaskOwnerScopeType.PLANTING) {
        return Promise.resolve(directTasks);
      }
      if (
        where?.ownerScopeType === null &&
        typeof where?.planting === 'string'
      ) {
        return Promise.resolve(legacyTasks);
      }
      if (
        (where?.ownerScopeType as Record<string, unknown>)?.['$in'] &&
        Array.isArray((where.ownerScopeType as Record<string, unknown>)['$in'])
      ) {
        return Promise.resolve(aggregatedTasks);
      }
      return Promise.resolve([]);
    }),
    nativeUpdate: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
  };

  const em = {
    findOne: jest.fn().mockResolvedValue(planting),
    flush: jest.fn().mockResolvedValue(undefined),
    transactional: jest.fn(async (cb: (em: unknown) => Promise<void>) => {
      txCallback = cb;
      await cb(txEm);
    }),
    // Expose inner em for assertions
    _txEm: txEm,
    _getTxCallback: () => txCallback,
  } as unknown as EntityManager & {
    _txEm: typeof txEm;
  };

  return em;
}

function makeService(em: EntityManager) {
  const warningsService = {
    getRulesMap: jest.fn().mockResolvedValue(new Map()),
    buildWarnings: jest.fn().mockResolvedValue([]),
  } as unknown as WarningsService;

  const actionAutomationService = {
    recomputeForPlanting: jest.fn().mockResolvedValue({ desiredCount: 0 }),
  } as unknown as ActionAutomationService;

  const plantingInsightsService = {
    recordEvent: jest.fn().mockResolvedValue(undefined),
    buildSeasonSummary: jest.fn().mockResolvedValue(undefined),
  } as unknown as PlantingInsightsService;

  const analyticsService = {
    recordVegetableAddedToBed: jest.fn().mockResolvedValue(undefined),
  } as unknown as AnalyticsService;

  return new PlantingsService(
    em,
    warningsService,
    actionAutomationService,
    plantingInsightsService,
    analyticsService,
    premiumEntitlementsService,
  );
}

const basePlanting = {
  id: PLANTING_A,
  name: 'Planting A',
  status: PlantingStatus.NEW,
  bed: { id: BED_ID },
  vegetable: { id: 'veg-1', name: 'Kapusta' },
};

describe('PlantingsService remove() — task cleanup', () => {
  it('cancels direct manual planting task on remove', async () => {
    const directTask = makeTask({
      id: 'task-direct-manual',
      status: ActionTaskStatus.PENDING,
      ownerScopeType: ActionTaskOwnerScopeType.PLANTING,
      ownerScopeId: PLANTING_A,
    });

    const em = buildEm(basePlanting, {
      directTasks: [directTask],
    });

    const service = makeService(em);
    const user = { id: USER_ID } as never;

    await service.remove(user, PLANTING_A);

    // Task must be cancelled — not pending
    expect(directTask.status).toBe(ActionTaskStatus.CANCELED);
    expect(directTask.suppressedAt).not.toBeNull();
  });

  it('removes planting from affectedPlantingIds and keeps related task if another planting remains', async () => {
    const aggregatedTask = makeTask({
      id: 'task-aggregated-bed',
      status: ActionTaskStatus.PENDING,
      ownerScopeType: ActionTaskOwnerScopeType.BED,
      ownerScopeId: BED_ID,
      metadata: { affectedPlantingIds: [PLANTING_A, PLANTING_B] },
    });

    const em = buildEm(basePlanting, {
      aggregatedTasks: [aggregatedTask],
    });

    const service = makeService(em);
    await service.remove({ id: USER_ID } as never, PLANTING_A);

    // Task must still be PENDING (B is still active)
    expect(aggregatedTask.status).toBe(ActionTaskStatus.PENDING);
    // PLANTING_A removed from list, PLANTING_B remains
    const ids = (
      aggregatedTask as unknown as Record<string, Record<string, unknown>>
    )['metadata']['affectedPlantingIds'];
    expect(ids).toEqual([PLANTING_B]);
  });

  it('cancels related bed task when removed planting was the last affected planting', async () => {
    const aggregatedTask = makeTask({
      id: 'task-aggregated-bed-last',
      status: ActionTaskStatus.PENDING,
      ownerScopeType: ActionTaskOwnerScopeType.BED,
      ownerScopeId: BED_ID,
      metadata: { affectedPlantingIds: [PLANTING_A] },
    });

    const em = buildEm(basePlanting, {
      aggregatedTasks: [aggregatedTask],
    });

    const service = makeService(em);
    await service.remove({ id: USER_ID } as never, PLANTING_A);

    // No plantings left → task must be cancelled
    expect(aggregatedTask.status).toBe(ActionTaskStatus.CANCELED);
    expect(aggregatedTask.suppressedAt).not.toBeNull();
  });
});
