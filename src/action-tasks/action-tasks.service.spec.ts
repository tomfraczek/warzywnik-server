import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTasksService } from './action-tasks.service';
import {
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../common/enums/action.enums';

type AnyTask = {
  id: string;
  user: { id: string };
  targetType: ActionTaskTargetType;
  planting?: {
    id: string;
    bed?: { id: string };
    vegetable?: { name: string };
  } | null;
  bed?: { id: string; name?: string } | null;
  status: ActionTaskStatus;
  source: string;
  sourceType: string;
  sourceRefId: string | null;
  sourceKey: string | null;
  cycleIndex: number;
  originalDueAt: Date | null;
  isManuallyRescheduled: boolean;
  isUserModified: boolean;
  suppressedAt: Date | null;
  generatedAt: Date | null;
  dueAt: Date | null;
  title: string;
  description: string | null;
  metadata?: Record<string, unknown> | null;
  actionTemplate: null;
  doneAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

describe('ActionTasksService list scoping', () => {
  const userId = 'user-1';
  const user = { id: userId } as never;
  const bedId = 'bed-1';
  const plantingId = 'planting-1';

  const now = new Date('2026-05-05T10:00:00.000Z');

  const createTask = (input: Partial<AnyTask> & { id: string }): AnyTask => ({
    id: input.id,
    user: { id: 'user-1' },
    targetType: input.targetType ?? ActionTaskTargetType.BED,
    planting: input.planting ?? null,
    bed: input.bed ?? null,
    status: input.status ?? ActionTaskStatus.PENDING,
    source: input.source ?? 'VEGETABLE_RULE',
    sourceType: input.sourceType ?? 'AUTOMATION',
    sourceRefId: input.sourceRefId ?? null,
    sourceKey: input.sourceKey ?? null,
    cycleIndex: input.cycleIndex ?? 0,
    originalDueAt: input.originalDueAt ?? null,
    isManuallyRescheduled: input.isManuallyRescheduled ?? false,
    isUserModified: input.isUserModified ?? false,
    suppressedAt: input.suppressedAt ?? null,
    generatedAt: input.generatedAt ?? now,
    dueAt: input.dueAt ?? now,
    title: input.title ?? 'Task',
    description: input.description ?? null,
    metadata: input.metadata ?? null,
    actionTemplate: null,
    doneAt: input.doneAt ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });

  const aggregatedBedTask = createTask({
    id: 'task-bed-aggregated',
    targetType: ActionTaskTargetType.BED,
    bed: { id: bedId, name: 'Grządka A' },
    planting: null,
    title: 'Zadanie zbiorcze dla grządki',
    metadata: {
      aggregationScope: 'bed',
      affectedPlantingIds: ['planting-1', 'planting-2'],
      affectedVegetables: ['Kapusta biała', 'Arbuz klasyczny'],
      originPlantingTaskCount: 2,
    },
  });

  const plantingTaskOnBed = createTask({
    id: 'task-planting',
    targetType: ActionTaskTargetType.PLANTING,
    planting: {
      id: plantingId,
      bed: { id: bedId },
      vegetable: { name: 'Pomidor' },
    },
    bed: null,
    title: 'Task uprawy',
  });

  // Technicznie możliwy przypadek dla zadań pogodowych: ustawione i bed, i planting.
  const plantingTaskWithBedRef = createTask({
    id: 'task-planting-with-bed',
    targetType: ActionTaskTargetType.PLANTING,
    planting: {
      id: 'planting-2',
      bed: { id: bedId },
      vegetable: { name: 'Papryka' },
    },
    bed: { id: bedId, name: 'Grządka A' },
    title: 'Task uprawy z referencją bed',
  });

  const tasks = [aggregatedBedTask, plantingTaskOnBed, plantingTaskWithBedRef];

  const matchesCondition = (
    task: AnyTask,
    condition: Record<string, unknown>,
  ) => {
    if ('bed' in condition) {
      return task.bed?.id === condition.bed;
    }

    if ('planting' in condition) {
      const plantingCondition = condition.planting as
        | { bed?: string }
        | undefined;
      if (plantingCondition?.bed) {
        return task.planting?.bed?.id === plantingCondition.bed;
      }
    }

    return false;
  };

  const matchesWhere = (task: AnyTask, where: Record<string, unknown>) => {
    if (where.user && task.user.id !== where.user) {
      return false;
    }

    if (where.status && task.status !== where.status) {
      return false;
    }

    if (where.targetType && task.targetType !== where.targetType) {
      return false;
    }

    if (where.bed && task.bed?.id !== where.bed) {
      return false;
    }

    if (where.planting && typeof where.planting === 'string') {
      if (task.planting?.id !== where.planting) {
        return false;
      }
    }

    if (where.$or) {
      const conditions = where.$or as Record<string, unknown>[];
      if (!conditions.some((condition) => matchesCondition(task, condition))) {
        return false;
      }
    }

    return true;
  };

  const createService = () => {
    const em = {
      findOne: jest
        .fn()
        .mockImplementation((_: unknown, where: Record<string, unknown>) => {
          if (where.id === bedId && where.user === userId) {
            return Promise.resolve({ id: bedId });
          }

          if (where.id === plantingId && where.user === userId) {
            return Promise.resolve({ id: plantingId });
          }

          return Promise.resolve(null);
        }),
      find: jest
        .fn()
        .mockImplementation((_: unknown, where: Record<string, unknown>) => {
          return Promise.resolve(
            tasks.filter((task) => matchesWhere(task, where)),
          );
        }),
    } as unknown as EntityManager;

    const service = new ActionTasksService(em, {} as never, {} as never);

    return { service, em };
  };

  it('listForBed(scope=own) returns only direct bed tasks and excludes planting tasks', async () => {
    const { service } = createService();

    const result = await service.listForBed(user, bedId, {
      status: 'all',
      scope: 'own',
    } as never);

    expect(result.map((item) => item.id)).toEqual(['task-bed-aggregated']);
    expect(result[0]?.targetType).toBe(ActionTaskTargetType.BED);
    expect(result[0]?.plantingId).toBeNull();
  });

  it('listForBed(scope=includingChildren) keeps historical mixed behavior', async () => {
    const { service } = createService();

    const result = await service.listForBed(user, bedId, {
      status: 'all',
      scope: 'includingChildren',
    } as never);

    expect(result.map((item) => item.id)).toEqual([
      'task-bed-aggregated',
      'task-planting',
      'task-planting-with-bed',
    ]);
  });

  it('aggregated bed task is visible in scope=own and includes metadata fields', async () => {
    const { service } = createService();

    const result = await service.listForBed(user, bedId, {
      status: 'all',
      scope: 'own',
    } as never);

    expect(result).toHaveLength(1);
    expect(result[0]?.metadata).toEqual({
      aggregationScope: 'bed',
      affectedPlantingIds: ['planting-1', 'planting-2'],
      affectedVegetables: ['Kapusta biała', 'Arbuz klasyczny'],
      originPlantingTaskCount: 2,
    });
    expect(result[0]?.bedName).toBe('Grządka A');
  });

  it('listForPlanting returns only tasks of selected planting and excludes bed-level tasks', async () => {
    const { service } = createService();

    const result = await service.listForPlanting(user, plantingId, {
      status: 'all',
    });

    expect(result.map((item) => item.id)).toEqual(['task-planting']);
    expect(result[0]?.targetType).toBe(ActionTaskTargetType.PLANTING);
  });

  it('listForBed default scope behaves like includingChildren', async () => {
    const { service } = createService();

    const result = await service.listForBed(user, bedId, {
      status: 'all',
    } as never);

    expect(result.map((item) => item.id)).toEqual([
      'task-bed-aggregated',
      'task-planting',
      'task-planting-with-bed',
    ]);
  });
});
