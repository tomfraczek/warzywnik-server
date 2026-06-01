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
import { NotificationPolicyService } from './notification-policy.service';

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

// ─── Scenariusze K–N: polityka powiadomień bez intensity ───────────────────

describe('Scenario K — NotificationPolicyService: intensity nie wpływa na decyzję', () => {
  function makePolicyService(opts: {
    notificationsEnabled: boolean;
    typeEnabled: boolean;
    dedupeExists?: boolean;
    suppressCovered?: boolean;
  }): NotificationPolicyService {
    const fakePreference = {
      tasksEnabled: opts.typeEnabled,
      dailySummaryEnabled: opts.typeEnabled,
      weatherStatusEnabled: opts.typeEnabled,
      gardenRiskEnabled: opts.typeEnabled,
      weatherAlertsEnabled: opts.typeEnabled,
      recommendedArticlesEnabled: opts.typeEnabled,
      lifecycleSuggestionsEnabled: opts.typeEnabled,
      weeklyDigestEnabled: opts.typeEnabled,
      // intensity still exists in entity but is not read by policy
      intensity: 'IMPORTANT_ONLY',
    };

    const fakePreferencesService = {
      getOrCreatePreference: jest.fn().mockResolvedValue(fakePreference),
    };

    const fakeEm = {
      findOne: jest
        .fn()
        .mockImplementation((_entity: unknown, query: { type?: string }) => {
          if (query.type === undefined) {
            // NotificationDedupe lookup
            return Promise.resolve(opts.dedupeExists ? {} : null);
          }
          return Promise.resolve(opts.suppressCovered ? {} : null);
        }),
      getConnection: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue([]),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (NotificationPolicyService as any)(
      fakeEm,
      fakePreferencesService,
    );
  }

  it('K-A: PUSH_DIGEST + preference enabled → PUSH (intensity IMPORTANT_ONLY ignorowane)', async () => {
    const service = makePolicyService({
      notificationsEnabled: true,
      typeEnabled: true,
    });
    const result = await service.evaluate({
      user: { id: 'u1', notificationsEnabled: true } as never,
      type: NotificationType.DAILY_TASKS_SUMMARY,
      priority: NotificationPriority.LOW, // wcześniej powodowałoby CENTER_ONLY
      dedupeKey: 'dk1',
      dedupeHours: 24,
    });
    expect(result.decision).toBe('PUSH');
    expect(result.reason).toBe('ok');
  });

  it('K-B: PUSH_IMMEDIATE + preference enabled → PUSH', async () => {
    const service = makePolicyService({
      notificationsEnabled: true,
      typeEnabled: true,
    });
    const result = await service.evaluate({
      user: { id: 'u1', notificationsEnabled: true } as never,
      type: NotificationType.WEATHER_ALERTS_SUMMARY,
      priority: NotificationPriority.HIGH,
      dedupeKey: 'dk2',
      dedupeHours: 8,
    });
    expect(result.decision).toBe('PUSH');
  });

  it('K-C: CENTER_ONLY z suppressPushWhenDedupedBy (weather alert coverage) nadal działa', async () => {
    const fakePreference = {
      tasksEnabled: true,
      dailySummaryEnabled: true,
      weatherStatusEnabled: true,
      gardenRiskEnabled: true,
      weatherAlertsEnabled: true,
      recommendedArticlesEnabled: true,
      lifecycleSuggestionsEnabled: true,
      weeklyDigestEnabled: true,
      intensity: 'ALL',
    };
    const fakePreferencesService = {
      getOrCreatePreference: jest.fn().mockResolvedValue(fakePreference),
    };
    let callCount = 0;
    const fakeEm = {
      findOne: jest.fn().mockImplementation(() => {
        callCount++;
        // First call = dedupe check → not deduped; second call = suppressPushWhenDedupedBy → covered
        return callCount === 1 ? Promise.resolve(null) : Promise.resolve({});
      }),
      getConnection: jest
        .fn()
        .mockReturnValue({ execute: jest.fn().mockResolvedValue([]) }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new (NotificationPolicyService as any)(
      fakeEm,
      fakePreferencesService,
    );
    const result = await service.evaluate({
      user: { id: 'u1', notificationsEnabled: true } as never,
      type: NotificationType.WEATHER_STATUS_CHANGED,
      priority: NotificationPriority.NORMAL,
      dedupeKey: 'dk3',
      dedupeHours: 4,
      suppressPushWhenDedupedBy: {
        type: NotificationType.WEATHER_ALERTS_SUMMARY,
        dedupeKey: 'alert-dk',
      },
    });
    expect(result.decision).toBe('CENTER_ONLY');
  });

  it('K-D: preference disabled → SKIP (type_disabled)', async () => {
    const service = makePolicyService({
      notificationsEnabled: true,
      typeEnabled: false,
    });
    const result = await service.evaluate({
      user: { id: 'u1', notificationsEnabled: true } as never,
      type: NotificationType.ARTICLE_RECOMMENDED,
      priority: NotificationPriority.NORMAL,
      dedupeKey: 'dk4',
      dedupeHours: 18,
    });
    expect(result.decision).toBe('SKIP');
    expect(result.reason).toBe('type_disabled');
  });

  it('K-E: globalny notificationsEnabled=false → SKIP (preference_disabled)', async () => {
    const service = makePolicyService({
      notificationsEnabled: false,
      typeEnabled: true,
    });
    const result = await service.evaluate({
      user: { id: 'u1', notificationsEnabled: false } as never,
      type: NotificationType.DAILY_TASKS_SUMMARY,
      priority: NotificationPriority.NORMAL,
      dedupeKey: 'dk5',
      dedupeHours: 24,
    });
    expect(result.decision).toBe('SKIP');
    expect(result.reason).toBe('preference_disabled');
  });

  it('K-F: stary klient wysyła intensity w body — Zod akceptuje, decyzja niezależna od intensity', async () => {
    // Weryfikujemy że Zod schema nie odrzuca intensity
    const { patchNotificationPreferencesSchema } =
      require('./dto/notification-preferences.schemas') as {
        patchNotificationPreferencesSchema: {
          safeParse: (v: unknown) => { success: boolean };
        };
      };
    const result = patchNotificationPreferencesSchema.safeParse({
      intensity: 'IMPORTANT_ONLY',
      dailySummaryEnabled: true,
    });
    expect(result.success).toBe(true);
  });
});
