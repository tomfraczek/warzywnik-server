/**
 * Weather task planner — ownership semantics tests.
 *
 * Verifies that:
 *   - WATERING warnings produce BED-level tasks
 *   - GREENHOUSE warnings do NOT produce tasks (Fallback B — no BED task for SPACE warnings)
 *     TODO: re-enable once WarningInstance.growingSpace FK exists → ownerScopeType=SPACE
 *   - SOWING_PAUSE warnings do NOT produce tasks (they are blocking: true alerts)
 */

import { EntityManager } from '@mikro-orm/postgresql';
import { WeatherTaskPlannerService } from './weather-task-planner.service';
import {
  ActionTaskOwnerScopeType,
  ActionTaskTargetType,
} from '../../common/enums/action.enums';
import { WarningCode } from '../../common/enums/warning.enums';

const BED_ID = 'bed-uuid-1';
const USER_ID = 'user-uuid-1';

function makeWarning(code: WarningCode, extra: Record<string, unknown> = {}) {
  return {
    id: `w-${code}`,
    code,
    isActive: true,
    validTo: new Date(Date.now() + 86400 * 1000),
    details: { localDate: new Date().toISOString().slice(0, 10), ...extra },
    bed: { id: BED_ID },
    planting: null,
    user: { id: USER_ID },
    ...extra,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildEm(existingTasks: unknown[] = []) {
  return {
    fork: jest.fn(function (this: unknown) {
      return this;
    }),
    findOne: jest
      .fn()
      .mockResolvedValue({ id: USER_ID, automaticTasksEnabled: true }),
    find: jest
      .fn()
      .mockImplementation((Entity: unknown, where: Record<string, unknown>) => {
        // Return warnings when queried for WarningInstance, empty otherwise
        if (where?.user === USER_ID && where?.isActive === true) {
          return Promise.resolve(existingTasks.length ? existingTasks : []);
        }
        return Promise.resolve([]);
      }),
    transactional: jest.fn(async (cb: (em: EntityManager) => Promise<void>) =>
      cb({} as unknown as EntityManager),
    ),
    persist: jest.fn(),
    flush: jest.fn(),
    getReference: jest.fn((_, id: string) => ({ id })),
  } as unknown as EntityManager;
}

describe('WeatherTaskPlannerService — SOWING_PAUSE is not in OPERATIONAL_TASK_CODES', () => {
  it('SOWING_PAUSE_TOO_COLD_TODAY does not generate a task', async () => {
    const persisted: unknown[] = [];
    const em = {
      fork: jest.fn(function (this: unknown) {
        return this;
      }),
      findOne: jest
        .fn()
        .mockResolvedValue({ id: USER_ID, automaticTasksEnabled: true }),
      find: jest
        .fn()
        .mockImplementation((_: unknown, where: Record<string, unknown>) => {
          if (where && 'isActive' in where) {
            return Promise.resolve([
              makeWarning(WarningCode.SOWING_PAUSE_TOO_COLD_TODAY),
            ]);
          }
          return Promise.resolve([]);
        }),
      transactional: jest.fn(async (cb: (em: unknown) => Promise<void>) => {
        const txEm = {
          find: jest.fn().mockResolvedValue([]),
          persist: jest.fn((t: unknown) => persisted.push(t)),
          flush: jest.fn(),
          getReference: jest.fn((_, id: string) => ({ id })),
        };
        await cb(txEm);
      }),
    } as unknown as EntityManager;

    const service = new WeatherTaskPlannerService(em, {
      publishTaskEvents: jest.fn(),
    } as never);
    await service.recomputeWeatherTasksForUser(USER_ID);

    expect(persisted).toHaveLength(0);
  });
});

describe('WeatherTaskPlannerService — WATERING_NEEDED creates BED task', () => {
  it('WATERING_NEEDED_TODAY creates ownerScopeType=BED task when bed is known', async () => {
    const created: Array<{
      ownerScopeType: string;
      targetType: string;
      ownerScopeId: string;
    }> = [];
    const em = {
      fork: jest.fn(function (this: unknown) {
        return this;
      }),
      findOne: jest
        .fn()
        .mockResolvedValue({ id: USER_ID, automaticTasksEnabled: true }),
      find: jest
        .fn()
        .mockImplementation((_: unknown, where: Record<string, unknown>) => {
          if (where && 'isActive' in where) {
            return Promise.resolve([
              makeWarning(WarningCode.WATERING_NEEDED_TODAY),
            ]);
          }
          return Promise.resolve([]);
        }),
      transactional: jest.fn(async (cb: (em: unknown) => Promise<void>) => {
        const txEm = {
          find: jest.fn().mockResolvedValue([]),
          persist: jest.fn(
            (t: {
              ownerScopeType: string;
              targetType: string;
              ownerScopeId: string;
            }) => created.push(t),
          ),
          flush: jest.fn(),
          getReference: jest.fn((_, id: string) => ({ id })),
          getConnection: jest.fn().mockReturnValue({ execute: jest.fn() }),
        };
        await cb(txEm);
      }),
    } as unknown as EntityManager;

    const service = new WeatherTaskPlannerService(em, {
      publishTaskEvents: jest.fn(),
    } as never);
    await service.recomputeWeatherTasksForUser(USER_ID);

    expect(created.length).toBeGreaterThanOrEqual(1);
    const task = created[0];
    expect(task.ownerScopeType).toBe(ActionTaskOwnerScopeType.BED);
    expect(task.targetType).toBe(ActionTaskTargetType.BED);
    expect(task.ownerScopeId).toBe(BED_ID);
  });
});

describe('WeatherTaskPlannerService — GREENHOUSE codes do not generate tasks (Fallback B)', () => {
  it('GREENHOUSE_HEAT_WAVE_TODAY_DAY does not create any task (no BED task for SPACE warning)', async () => {
    const created: unknown[] = [];
    const em = {
      fork: jest.fn(function (this: unknown) {
        return this;
      }),
      findOne: jest
        .fn()
        .mockResolvedValue({ id: USER_ID, automaticTasksEnabled: true }),
      find: jest
        .fn()
        .mockImplementation((_: unknown, where: Record<string, unknown>) => {
          if (where && 'isActive' in where) {
            return Promise.resolve([
              makeWarning(WarningCode.GREENHOUSE_HEAT_WAVE_TODAY_DAY),
            ]);
          }
          return Promise.resolve([]);
        }),
      transactional: jest.fn(async (cb: (em: unknown) => Promise<void>) => {
        const txEm = {
          find: jest.fn().mockResolvedValue([]),
          persist: jest.fn((t: unknown) => created.push(t)),
          flush: jest.fn(),
          getReference: jest.fn((_, id: string) => ({ id })),
          getConnection: jest.fn().mockReturnValue({ execute: jest.fn() }),
        };
        await cb(txEm);
      }),
    } as unknown as EntityManager;

    const service = new WeatherTaskPlannerService(em, {
      publishTaskEvents: jest.fn(),
    } as never);
    await service.recomputeWeatherTasksForUser(USER_ID);

    // Greenhouse warnings must NOT generate any task until WarningInstance.growingSpace FK exists.
    // Creating a BED task for a SPACE warning would produce incorrect ownership.
    expect(created).toHaveLength(0);
  });
});
