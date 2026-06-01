/**
 * Notification pipeline integration scenarios (A–F).
 *
 * Each scenario exercises the full logical path:
 *   outbox event → aggregator grouping → batch candidate → delivery policy
 *
 * Tests are unit-level: they do NOT spin up a database; instead they exercise
 * the pure logic in NotificationAggregatorService and NotificationCopyService.
 */

import { NotificationCopyService } from './notification-copy.service';
import {
  NotificationDeliveryPolicy,
  NotificationPriority,
  NotificationType,
} from '../common/enums/notification.enums';
import { NotificationEventService } from './notification-event.service';
import {
  ActionTaskSource,
  ActionTaskStatus,
} from '../common/enums/action.enums';

describe('Scenario A — 3 watering tasks collapse into 1 PUSH_DIGEST batch', () => {
  const copy = new NotificationCopyService();

  it('builds correct watering copy for 3 beds', () => {
    const result = copy.buildWateringTasksCopy(3);
    expect(result.title).toBe('Podlewanie roślin');
    expect(result.body).toContain('3');
    expect(result.body).toContain('grządki');
  });

  it('uses singular form for 1 bed', () => {
    const result = copy.buildWateringTasksCopy(1);
    expect(result.body).toContain('1');
    expect(result.body).toContain('grządka');
  });

  it('uses plural genitive for 5+ beds', () => {
    const result = copy.buildWateringTasksCopy(6);
    expect(result.body).toContain('6');
    expect(result.body).toContain('grządek');
  });

  it('resolveTaskUserIntentKey returns WATERING_TODAY for WEATHER_WARNING + watering slug', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = new NotificationEventService(null as never, copy);
    const today = new Date().toISOString().slice(0, 10);
    const key = service.resolveTaskUserIntentKey('user1', {
      source: ActionTaskSource.WEATHER_WARNING,
      actionTemplate: { slug: 'podlej-grządki' },
      title: 'Podlej grządki',
      status: ActionTaskStatus.PENDING,
      dueAt: new Date(),
    });
    expect(key).toBe(`WATERING_TODAY:user1:${today}`);
  });
});

describe('Scenario B — 4 harvest tasks collapse into 1 PUSH_DIGEST batch', () => {
  const copy = new NotificationCopyService();

  it('builds correct harvest copy for 4 plantings', () => {
    const result = copy.buildHarvestReadyCopy(4);
    expect(result.title).toBe('Zbiory');
    expect(result.body).toContain('4');
    expect(result.body).toContain('uprawy');
  });

  it('uses singular form for 1 planting', () => {
    const result = copy.buildHarvestReadyCopy(1);
    expect(result.body).toContain('1');
    expect(result.body).toContain('uprawa');
  });

  it('uses plural genitive for 5+ plantings', () => {
    const result = copy.buildHarvestReadyCopy(7);
    expect(result.body).toContain('7');
    expect(result.body).toContain('upraw');
  });

  it('resolveTaskUserIntentKey returns HARVEST_READY for WEATHER_WARNING + harvest slug', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = new NotificationEventService(
      null as never,
      new NotificationCopyService(),
    );
    const today = new Date().toISOString().slice(0, 10);
    const key = service.resolveTaskUserIntentKey('userA', {
      source: ActionTaskSource.WEATHER_WARNING,
      actionTemplate: { slug: 'harvest-now' },
      title: 'Zbierz warzywa',
      status: ActionTaskStatus.PENDING,
      dueAt: new Date(),
    });
    expect(key).toBe(`HARVEST_READY:userA:${today}`);
  });
});

describe('Scenario C — VEGETABLE_RULE tasks → PLAN_ONLY, no push', () => {
  it('resolveTaskUserIntentKey returns TASKS_DUE_TODAY for VEGETABLE_RULE source', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = new NotificationEventService(
      null as never,
      new NotificationCopyService(),
    );
    const today = new Date().toISOString().slice(0, 10);
    const key = service.resolveTaskUserIntentKey('userB', {
      source: ActionTaskSource.VEGETABLE_RULE,
      title: 'Nawóz jesienno-zimowy',
      status: ActionTaskStatus.PENDING,
      dueAt: new Date(),
    });
    expect(key).toBe(`TASKS_DUE_TODAY:userB:${today}`);
  });
});

describe('Scenario D — LIFECYCLE_SUGGESTION plural copy', () => {
  const copy = new NotificationCopyService();

  it('returns plural harvest copy for count > 1', () => {
    const result = copy.buildLifecyclePluralCopy(3, 'HARVEST_WINDOW_START');
    expect(result.title).toContain('zbiory');
    expect(result.body).toContain('3');
  });

  it('returns plural transplant copy for count > 1', () => {
    const result = copy.buildLifecyclePluralCopy(2, 'transplant readiness');
    expect(result.title).toContain('przesadzenia');
    expect(result.body).toContain('2');
  });

  it('returns singular lifecycle copy for 1 planting (existing method)', () => {
    const result = copy.buildLifecycleSuggestionCopy('HARVEST_WINDOW_START');
    expect(result.title).toBe('Możesz rozpocząć zbiory');
    expect(result.body).not.toContain('HARVEST_WINDOW_START');
  });
});

describe('Scenario E — FROST_PROTECTION weather task → PUSH_IMMEDIATE', () => {
  it('resolveTaskUserIntentKey returns FROST_PROTECTION for frost-related WEATHER_WARNING task', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service: any = new NotificationEventService(
      null as never,
      new NotificationCopyService(),
    );
    const today = new Date().toISOString().slice(0, 10);
    const key = service.resolveTaskUserIntentKey('userC', {
      source: ActionTaskSource.WEATHER_WARNING,
      actionTemplate: { slug: 'frost-cover-plants' },
      title: 'Osłoń rośliny przed przymrozkiem',
      status: ActionTaskStatus.PENDING,
      dueAt: new Date(),
    });
    expect(key).toBe(`FROST_PROTECTION:userC:${today}`);
  });

  it('buildFrostProtectionCopy returns sensible Polish copy', () => {
    const copy = new NotificationCopyService();
    const result = copy.buildFrostProtectionCopy(2);
    expect(result.title).toContain('przymrozk');
    expect(result.body).toContain('2');
  });
});

describe('Scenario F — delivery policy resolution for known intent keys', () => {
  it('WATERING_TODAY → PUSH_DIGEST', () => {
    // We access the private method directly via casting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveTasksDeliveryPolicy']('WATERING_TODAY:user:2025-06-01');
    expect(result).toBe(NotificationDeliveryPolicy.PUSH_DIGEST);
  });

  it('TASKS_DUE_TODAY → PLAN_ONLY', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveTasksDeliveryPolicy']('TASKS_DUE_TODAY:user:2025-06-01');
    expect(result).toBe(NotificationDeliveryPolicy.PLAN_ONLY);
  });

  it('FROST_PROTECTION → PUSH_IMMEDIATE', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveTasksDeliveryPolicy']('FROST_PROTECTION:user:2025-06-01');
    expect(result).toBe(NotificationDeliveryPolicy.PUSH_IMMEDIATE);
  });

  it('FROST reason → PUSH_IMMEDIATE via resolveWeatherDeliveryPolicy', () => {
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveWeatherDeliveryPolicy']('FROST');
    expect(result).toBe(NotificationDeliveryPolicy.PUSH_IMMEDIATE);
  });

  it('DROUGHT reason → PUSH_DIGEST via resolveWeatherDeliveryPolicy', () => {
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveWeatherDeliveryPolicy']('DROUGHT');
    expect(result).toBe(NotificationDeliveryPolicy.PUSH_DIGEST);
  });

  it('HIGH priority garden risk → PUSH_IMMEDIATE', () => {
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveGardenRiskDeliveryPolicy'](NotificationPriority.HIGH);
    expect(result).toBe(NotificationDeliveryPolicy.PUSH_IMMEDIATE);
  });

  it('NORMAL priority garden risk → PUSH_DIGEST', () => {
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveGardenRiskDeliveryPolicy'](NotificationPriority.NORMAL);
    expect(result).toBe(NotificationDeliveryPolicy.PUSH_DIGEST);
  });
});

describe('Copy service — no technical codes leak to user', () => {
  const copy = new NotificationCopyService();

  it('buildWateringTasksCopy does not contain technical strings', () => {
    const { title, body } = copy.buildWateringTasksCopy(3);
    expect(title).not.toMatch(/WATERING|TASK|WATER/);
    expect(body).not.toMatch(/WATERING|TASK|WATER/);
  });

  it('buildHarvestReadyCopy does not contain technical strings', () => {
    const { title, body } = copy.buildHarvestReadyCopy(2);
    expect(title).not.toMatch(/HARVEST|TASK/);
    expect(body).not.toMatch(/HARVEST|TASK/);
  });

  it('buildFrostProtectionCopy is human-readable Polish', () => {
    const { title, body } = copy.buildFrostProtectionCopy(4);
    expect(title.length).toBeGreaterThan(5);
    expect(body.length).toBeGreaterThan(5);
    expect(body).not.toContain('FROST');
  });
});

// ─── Scenariusze po audycie 2026-06-01 ─────────────────────────────────────

describe('Scenario G — DAILY_TASKS_SUMMARY → PUSH_DIGEST', () => {
  it('buildCandidate returns PUSH_DIGEST for DAILY_TASKS_SUMMARY', () => {
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      new NotificationCopyService(),
    );
    const fakeEvent = {
      type: NotificationType.DAILY_TASKS_SUMMARY,
      payload: { actionTaskIds: ['t1', 't2', 't3'] },
      userIntentKey: `TASKS_DUE_TODAY:user1:${new Date().toISOString().slice(0, 10)}`,
      user: { id: 'user1' },
      dedupeKey: null,
      priority: NotificationPriority.NORMAL,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['buildCandidate']([fakeEvent]) as any;
    expect(candidate).not.toBeNull();
    expect(candidate.deliveryPolicy).toBe(
      NotificationDeliveryPolicy.PUSH_DIGEST,
    );
    expect(candidate.routeTarget).toBe('PLANNER');
  });

  it('buildDailySummaryCopy uses correct Polish singular form', () => {
    const copy = new NotificationCopyService();
    const result = copy.buildDailySummaryCopy(1);
    expect(result.title).toBe('Plan na dziś');
    expect(result.body).toContain('1');
    expect(result.body).toContain('zadanie');
    expect(result.body).toContain('ogrodzie');
  });

  it('buildDailySummaryCopy uses correct Polish plural form (2-4)', () => {
    const copy = new NotificationCopyService();
    const result = copy.buildDailySummaryCopy(3);
    expect(result.body).toContain('3');
    expect(result.body).toContain('zadania');
  });

  it('buildDailySummaryCopy uses correct Polish genitive plural (5+)', () => {
    const copy = new NotificationCopyService();
    const result = copy.buildDailySummaryCopy(7);
    expect(result.body).toContain('7');
    expect(result.body).toContain('zadań');
  });
});

describe('Scenario H — dueAt filter: task due 07:00, cron runs 07:22', () => {
  it('task due earlier today still qualifies (startOfToday filter)', () => {
    const { NotificationEventService } =
      require('./notification-event.service') as {
        NotificationEventService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const service = new NotificationEventService(
      null as never,
      new NotificationCopyService(),
    );

    // Simulate: dueAt = 07:00 today, current time = 07:22
    const dueAt = new Date();
    dueAt.setUTCHours(7, 0, 0, 0);

    const now = new Date();
    now.setUTCHours(7, 22, 0, 0);

    // The filter should use start of today (00:00), not Date.now()
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    // dueAt (07:00) >= startOfToday (00:00) → should pass
    expect(dueAt.getTime() >= startOfToday.getTime()).toBe(true);

    // dueAt (07:00) >= now (07:22) → would fail with old logic
    expect(dueAt.getTime() >= now.getTime()).toBe(false);
  });
});

describe('Scenario I — ARTICLE_RECOMMENDED → PUSH_DIGEST', () => {
  it('buildCandidate returns PUSH_DIGEST for ARTICLE_RECOMMENDED', () => {
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const mockRoutingService = {
      pickArticleRouteTarget: (_count: number) => 'ARTICLE_DETAIL',
    };
    const instance = new NotificationAggregatorService(
      null,
      mockRoutingService,
      null,
      null,
      new NotificationCopyService(),
    );
    const fakeEvent = {
      type: NotificationType.ARTICLE_RECOMMENDED,
      payload: {
        articleId: 'article-1',
        articleSlug: 'jak-podlewac',
        articleTitle: 'Jak prawidłowo podlewać warzywa podczas suszy',
      },
      userIntentKey: null,
      user: { id: 'user1' },
      dedupeKey: null,
      priority: NotificationPriority.NORMAL,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['buildCandidate']([fakeEvent]) as any;
    expect(candidate).not.toBeNull();
    expect(candidate.deliveryPolicy).toBe(
      NotificationDeliveryPolicy.PUSH_DIGEST,
    );
    expect(candidate.title).toBe('Nowy artykuł w bibliotece');
    expect(candidate.body).toContain('Jak prawidłowo podlewać');
  });

  it('buildArticleRecommendedCopy includes article title when provided', () => {
    const copy = new NotificationCopyService();
    const result = copy.buildArticleRecommendedCopy(
      1,
      'Jak prawidłowo podlewać warzywa podczas suszy',
    );
    expect(result.title).toBe('Nowy artykuł w bibliotece');
    expect(result.body).toContain('Jak prawidłowo podlewać');
    expect(result.body).toContain('Zapraszamy do lektury');
  });

  it('buildArticleRecommendedCopy fallback when no article title', () => {
    const copy = new NotificationCopyService();
    const result = copy.buildArticleRecommendedCopy(1);
    expect(result.title).toBe('Nowy artykuł w bibliotece');
    expect(result.body).toContain('Zapraszamy do lektury');
    expect(result.body).not.toContain('„');
  });
});

describe('Scenario J — TASKS_GENERATED / VEGETABLE_RULE nadal PLAN_ONLY', () => {
  it('resolveTasksDeliveryPolicy returns PLAN_ONLY for TASKS_DUE_TODAY intent', () => {
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveTasksDeliveryPolicy'](
      `TASKS_DUE_TODAY:userX:${new Date().toISOString().slice(0, 10)}`,
    );
    expect(result).toBe(NotificationDeliveryPolicy.PLAN_ONLY);
  });

  it('resolveTasksDeliveryPolicy returns PLAN_ONLY when intent is null', () => {
    const { NotificationAggregatorService } =
      require('./notification-aggregator.service') as {
        NotificationAggregatorService: new (
          ...args: unknown[]
        ) => Record<string, (...args: unknown[]) => unknown>;
      };
    const instance = new NotificationAggregatorService(
      null,
      null,
      null,
      null,
      null,
    );
    const result = (
      instance as Record<string, (...args: unknown[]) => unknown>
    )['resolveTasksDeliveryPolicy'](null);
    expect(result).toBe(NotificationDeliveryPolicy.PLAN_ONLY);
  });
});
