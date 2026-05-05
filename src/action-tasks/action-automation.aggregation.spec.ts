import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';

type Scope = 'none' | 'bed' | 'space' | 'user';

describe('ActionAutomationService aggregation', () => {
  const createTemplate = (
    id: string,
    scope: Scope,
    requiresUserConfirmation = false,
  ) =>
    ({
      id,
      name: `Template ${id}`,
      slug: `template-${id}`,
      description: null,
      target: 'planting',
      aggregationScope: scope,
      requiresUserConfirmation,
    }) as unknown;

  const createPlanting = (bedId: string, growingSpaceId: string) =>
    ({
      id: `planting-${bedId}`,
      bed: { id: bedId, growingSpace: { id: growingSpaceId } },
      vegetable: { name: 'Pomidor' },
      timelineTimezone: 'UTC',
    }) as never;

  const createOccurrence = (input: {
    sourceKey: string;
    templateId?: string;
    decisionType?: string;
    dueAt: Date;
    aggregationScope?: Scope;
    plantingId: string;
  }) => ({
    sourceKey: input.sourceKey,
    templateId: input.templateId,
    decisionType: input.decisionType,
    sourceMode: 'ROUTINE_RULE' as const,
    aggregationScope: input.aggregationScope ?? 'none',
    plantingIds: [input.plantingId],
    vegetableNames: ['Pomidor'],
    cycleIndex: 0,
    dueAt: input.dueAt,
  });

  it('aggregates 5 plantings on one bed into 1 task', () => {
    const service = new ActionAutomationService({} as EntityManager);
    const target = service as unknown as {
      aggregateDesiredOccurrences: (params: {
        user: { id: string };
        planting: never;
        desired: unknown[];
        templatesById: Map<string, unknown>;
      }) => { desired: Array<{ sourceKey: string; plantingIds: string[] }> };
    };

    const dueAt = new Date('2026-05-05T08:00:00.000Z');
    const result = target.aggregateDesiredOccurrences({
      user: { id: 'user-1' },
      planting: createPlanting('bed-1', 'space-1'),
      desired: [1, 2, 3, 4, 5].map((index) =>
        createOccurrence({
          sourceKey: `p-${index}:tpl-1:${index}`,
          templateId: 'tpl-1',
          decisionType: 'MOISTURE_CHECK',
          dueAt,
          aggregationScope: 'bed',
          plantingId: `planting-${index}`,
        }),
      ),
      templatesById: new Map([['tpl-1', createTemplate('tpl-1', 'bed')]]),
    });

    expect(result.desired).toHaveLength(1);
    expect(result.desired[0]?.sourceKey).toContain('AGGREGATED_BED');
    expect(result.desired[0]?.plantingIds).toHaveLength(5);
  });

  it('keeps tasks separate for scope none', () => {
    const service = new ActionAutomationService({} as EntityManager);
    const target = service as unknown as {
      aggregateDesiredOccurrences: (params: {
        user: { id: string };
        planting: never;
        desired: unknown[];
        templatesById: Map<string, unknown>;
      }) => { desired: Array<{ sourceKey: string }> };
    };

    const dueAt = new Date('2026-05-05T08:00:00.000Z');
    const result = target.aggregateDesiredOccurrences({
      user: { id: 'user-1' },
      planting: createPlanting('bed-1', 'space-1'),
      desired: [1, 2, 3].map((index) =>
        createOccurrence({
          sourceKey: `p-${index}:tpl-1`,
          templateId: 'tpl-1',
          dueAt,
          aggregationScope: 'none',
          plantingId: `planting-${index}`,
        }),
      ),
      templatesById: new Map([['tpl-1', createTemplate('tpl-1', 'none')]]),
    });

    expect(result.desired).toHaveLength(3);
  });

  it('creates separate keys for two beds', () => {
    const service = new ActionAutomationService({} as EntityManager);
    const target = service as unknown as {
      aggregateDesiredOccurrences: (params: {
        user: { id: string };
        planting: never;
        desired: unknown[];
        templatesById: Map<string, unknown>;
      }) => { desired: Array<{ sourceKey: string }> };
    };

    const dueAt = new Date('2026-05-05T08:00:00.000Z');
    const templatesById = new Map([['tpl-1', createTemplate('tpl-1', 'bed')]]);

    const first = target.aggregateDesiredOccurrences({
      user: { id: 'user-1' },
      planting: createPlanting('bed-1', 'space-1'),
      desired: [
        createOccurrence({
          sourceKey: 'p-1:tpl-1',
          templateId: 'tpl-1',
          dueAt,
          aggregationScope: 'bed',
          plantingId: 'planting-1',
        }),
      ],
      templatesById,
    });
    const second = target.aggregateDesiredOccurrences({
      user: { id: 'user-1' },
      planting: createPlanting('bed-2', 'space-1'),
      desired: [
        createOccurrence({
          sourceKey: 'p-2:tpl-1',
          templateId: 'tpl-1',
          dueAt,
          aggregationScope: 'bed',
          plantingId: 'planting-2',
        }),
      ],
      templatesById,
    });

    expect(first.desired[0]?.sourceKey).not.toBe(second.desired[0]?.sourceKey);
  });

  it('keeps separate tasks for different templates', () => {
    const service = new ActionAutomationService({} as EntityManager);
    const target = service as unknown as {
      aggregateDesiredOccurrences: (params: {
        user: { id: string };
        planting: never;
        desired: unknown[];
        templatesById: Map<string, unknown>;
      }) => { desired: Array<{ sourceKey: string }> };
    };

    const dueAt = new Date('2026-05-05T08:00:00.000Z');
    const result = target.aggregateDesiredOccurrences({
      user: { id: 'user-1' },
      planting: createPlanting('bed-1', 'space-1'),
      desired: [
        createOccurrence({
          sourceKey: 'p-1:tpl-1',
          templateId: 'tpl-1',
          dueAt,
          aggregationScope: 'bed',
          plantingId: 'planting-1',
        }),
        createOccurrence({
          sourceKey: 'p-2:tpl-2',
          templateId: 'tpl-2',
          dueAt,
          aggregationScope: 'bed',
          plantingId: 'planting-2',
        }),
      ],
      templatesById: new Map([
        ['tpl-1', createTemplate('tpl-1', 'bed')],
        ['tpl-2', createTemplate('tpl-2', 'bed')],
      ]),
    });

    expect(result.desired).toHaveLength(2);
  });

  it('updates existing pending aggregated task (dedupe)', async () => {
    const existingTask = {
      sourceType: 'AUTOMATION',
      status: 'pending',
      suppressedAt: null,
      isManuallyRescheduled: false,
      isUserModified: false,
      metadata: {
        affectedPlantingIds: ['planting-1'],
        affectedVegetables: ['Pomidor'],
      },
    } as unknown as Record<string, unknown>;
    const em = {
      findOne: jest.fn().mockResolvedValue(existingTask),
    } as unknown as EntityManager;

    const service = new ActionAutomationService({} as EntityManager);
    const target = service as unknown as {
      upsertReminderForTask: jest.Mock;
      upsertAggregatedGeneratedTaskAndReminder: (params: {
        user: { id: string };
        planting: never;
        template: unknown;
        decisionType: null;
        dueAt: Date;
        sourceKey: string;
        sourceMode: 'ROUTINE_RULE' | 'DECISION_ENGINE';
        aggregationScope: Scope;
        plantingIds: string[];
        vegetableNames: string[];
        forceOverrideManual: boolean;
        em: EntityManager;
      }) => Promise<void>;
    };
    target.upsertReminderForTask = jest.fn().mockResolvedValue(undefined);

    await target.upsertAggregatedGeneratedTaskAndReminder({
      user: { id: 'user-1' },
      planting: createPlanting('bed-1', 'space-1'),
      template: createTemplate('tpl-1', 'bed'),
      decisionType: null,
      dueAt: new Date('2026-05-05T08:00:00.000Z'),
      sourceKey:
        'user-1:bed-1:2026-05-05:tpl-1:GENERAL_MONITORING:ROUTINE_RULE:AGGREGATED_BED',
      sourceMode: 'ROUTINE_RULE',
      aggregationScope: 'bed',
      plantingIds: ['planting-1', 'planting-2'],
      vegetableNames: ['Pomidor', 'Papryka'],
      forceOverrideManual: false,
      em,
    });

    const metadata = existingTask.metadata as Record<string, unknown>;
    expect(metadata.aggregationScope).toBe('bed');
    expect(metadata.originPlantingTaskCount).toBe(2);
  });

  it('does not aggregate task without template (manual-like)', () => {
    const service = new ActionAutomationService({} as EntityManager);
    const target = service as unknown as {
      aggregateDesiredOccurrences: (params: {
        user: { id: string };
        planting: never;
        desired: unknown[];
        templatesById: Map<string, unknown>;
      }) => { desired: Array<{ sourceKey: string }> };
    };

    const result = target.aggregateDesiredOccurrences({
      user: { id: 'user-1' },
      planting: createPlanting('bed-1', 'space-1'),
      desired: [
        createOccurrence({
          sourceKey: 'manual:1',
          dueAt: new Date('2026-05-05T08:00:00.000Z'),
          plantingId: 'planting-1',
        }),
      ],
      templatesById: new Map(),
    });

    expect(result.desired).toHaveLength(1);
    expect(result.desired[0]?.sourceKey).toBe('manual:1');
  });

  it('does not aggregate requiresUserConfirmation=true templates', () => {
    const service = new ActionAutomationService({} as EntityManager);
    const target = service as unknown as {
      aggregateDesiredOccurrences: (params: {
        user: { id: string };
        planting: never;
        desired: unknown[];
        templatesById: Map<string, unknown>;
      }) => {
        desired: Array<{ sourceKey: string }>;
        debugGroups: Array<{ reason: string }>;
      };
    };

    const result = target.aggregateDesiredOccurrences({
      user: { id: 'user-1' },
      planting: createPlanting('bed-1', 'space-1'),
      desired: [
        createOccurrence({
          sourceKey: 'p-1:tpl-1',
          templateId: 'tpl-1',
          dueAt: new Date('2026-05-05T08:00:00.000Z'),
          aggregationScope: 'bed',
          plantingId: 'planting-1',
        }),
      ],
      templatesById: new Map([['tpl-1', createTemplate('tpl-1', 'bed', true)]]),
    });

    expect(result.desired).toHaveLength(1);
    expect(
      result.debugGroups.some((item) =>
        item.reason.includes('requiresUserConfirmation=true'),
      ),
    ).toBe(true);
  });
});
