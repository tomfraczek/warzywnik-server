import { BadGatewayException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  RevenueCatService,
  RevenueCatWebhookPayload,
} from './revenuecat.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { RevenueCatEvent } from './revenuecat-event.entity';
import { User } from '../users/user.entity';
import { SubscriptionPlan } from '../common/enums/user.enums';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_PROJECT_ID = 'proj_test123';
const MOCK_PREMIUM_ENTITLEMENT_ID = 'entla_premium_test';
const FUTURE_MS = Date.now() + 30 * 24 * 60 * 60 * 1000;
const FUTURE_DATE = new Date(FUTURE_MS);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeMockUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  user.id = 'user-uuid-123';
  user.clerkUserId = 'clerk_abc';
  user.subscriptionPlan = SubscriptionPlan.FREE;
  user.subscriptionExpiresAt = null;
  user.trialStartedAt = new Date('2025-01-01');
  user.trialEndsAt = new Date('2025-01-08');
  return Object.assign(user, overrides);
};

const makeWebhookPayload = (
  type: string,
  overrides: Partial<RevenueCatWebhookPayload['event']> = {},
): RevenueCatWebhookPayload => ({
  api_version: '1.0',
  event: {
    id: 'event-id-001',
    type,
    app_user_id: 'user-uuid-123',
    entitlement_ids: ['premium'],
    expiration_at_ms: FUTURE_MS,
    transaction_id: 'txn-001',
    event_timestamp_ms: Date.now(),
    ...overrides,
  },
});

/**
 * Mocks two sequential fetch calls:
 * 1. GET /v2/projects/{projectId}/entitlements  → resolves premiumEntitlementId
 * 2. GET /v2/projects/{projectId}/customers/{userId}/active_entitlements
 */
const setupV2Fetch = (options: {
  activeItems?: { entitlement_id: string; expires_at: number | null }[];
  entitlementsOk?: boolean;
  activeOk?: boolean;
  networkError?: boolean;
}) => {
  const {
    activeItems = [],
    entitlementsOk = true,
    activeOk = true,
    networkError = false,
  } = options;

  if (networkError) {
    global.fetch = jest.fn().mockRejectedValue(new Error('fetch ECONNREFUSED'));
    return;
  }

  global.fetch = jest
    .fn()
    // call 1: resolve premium entitlement ID
    .mockResolvedValueOnce({
      ok: entitlementsOk,
      status: entitlementsOk ? 200 : 500,
      json: jest.fn().mockResolvedValue({
        object: 'list',
        items: [
          {
            object: 'entitlement',
            id: MOCK_PREMIUM_ENTITLEMENT_ID,
            lookup_key: 'premium',
            display_name: 'Premium',
            project_id: MOCK_PROJECT_ID,
            created_at: 1000000,
          },
        ],
        next_page: null,
      }),
    } as unknown as Response)
    // call 2: active entitlements for the customer
    .mockResolvedValueOnce({
      ok: activeOk,
      status: activeOk ? 200 : 503,
      json: jest.fn().mockResolvedValue({
        object: 'list',
        items: activeItems,
        next_page: null,
      }),
    } as unknown as Response);
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('RevenueCatService', () => {
  let service: RevenueCatService;
  let mockEm: jest.Mocked<
    Pick<
      EntityManager,
      'findOne' | 'persist' | 'flush' | 'persistAndFlush' | 'transactional'
    >
  >;
  let mockEntitlementsService: jest.Mocked<
    Pick<EntitlementsService, 'getEntitlements'>
  >;

  const mockTransactional = (
    findOneSideEffect: (entityClass: unknown) => unknown,
  ) => {
    mockEm.transactional.mockImplementation((cb) => {
      const txEm = {
        ...mockEm,
        findOne: jest.fn().mockImplementation(findOneSideEffect),
        persist: jest.fn(),
      };
      return Promise.resolve(cb(txEm as unknown as EntityManager));
    });
  };

  beforeEach(async () => {
    mockEm = {
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(),
    };

    mockEntitlementsService = {
      getEntitlements: jest
        .fn()
        .mockReturnValue({ plan: 'premium', isPremium: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueCatService,
        { provide: EntityManager, useValue: mockEm },
        { provide: EntitlementsService, useValue: mockEntitlementsService },
      ],
    }).compile();

    service = module.get<RevenueCatService>(RevenueCatService);

    // Reset lazy cache so every test starts with a fresh entitlement ID resolution
    (
      service as unknown as { premiumEntitlementIdCache: null }
    ).premiumEntitlementIdCache = null;

    process.env.REVENUECAT_SECRET_API_KEY = 'test-secret-key';
    process.env.REVENUECAT_PROJECT_ID = MOCK_PROJECT_ID;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.REVENUECAT_SECRET_API_KEY;
    delete process.env.REVENUECAT_PROJECT_ID;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Webhook tests (unchanged — webhook does not use the V2 REST API)
  // ══════════════════════════════════════════════════════════════════════════

  const setupWebhookTransaction = (
    user: User | null,
    existingEvent: RevenueCatEvent | null = null,
  ) => {
    mockTransactional((entityClass) => {
      if (entityClass === RevenueCatEvent)
        return Promise.resolve(existingEvent);
      if (entityClass === User) return Promise.resolve(user);
      return Promise.resolve(null);
    });
  };

  describe('processWebhook — INITIAL_PURCHASE', () => {
    it('sets subscriptionPlan=premium and subscriptionExpiresAt', async () => {
      const user = makeMockUser();
      setupWebhookTransaction(user);

      await service.processWebhook(makeWebhookPayload('INITIAL_PURCHASE'));

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
    });
  });

  describe('processWebhook — RENEWAL', () => {
    it('extends subscriptionExpiresAt for premium', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      setupWebhookTransaction(user);

      await service.processWebhook(makeWebhookPayload('RENEWAL'));

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
    });
  });

  describe('processWebhook — CANCELLATION', () => {
    it('keeps plan=premium with updated expiry (no immediate revocation)', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      setupWebhookTransaction(user);

      await service.processWebhook(
        makeWebhookPayload('CANCELLATION', { expiration_at_ms: FUTURE_MS }),
      );

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
    });

    it('does not change subscriptionExpiresAt when expiration_at_ms is absent', async () => {
      const existingExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const user = makeMockUser({
        subscriptionPlan: SubscriptionPlan.PREMIUM,
        subscriptionExpiresAt: existingExpiry,
      });
      setupWebhookTransaction(user);

      await service.processWebhook(
        makeWebhookPayload('CANCELLATION', { expiration_at_ms: undefined }),
      );

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(existingExpiry);
    });
  });

  describe('processWebhook — EXPIRATION', () => {
    it('sets subscriptionPlan=free and clears subscriptionExpiresAt', async () => {
      const user = makeMockUser({
        subscriptionPlan: SubscriptionPlan.PREMIUM,
        subscriptionExpiresAt: new Date(Date.now() - 1000),
      });
      setupWebhookTransaction(user);

      await service.processWebhook(makeWebhookPayload('EXPIRATION'));

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(user.subscriptionExpiresAt).toBeNull();
    });
  });

  describe('processWebhook — BILLING_ISSUE', () => {
    it('does not revoke premium when expiration_at_ms is in the future', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      setupWebhookTransaction(user);

      await service.processWebhook(
        makeWebhookPayload('BILLING_ISSUE', { expiration_at_ms: FUTURE_MS }),
      );

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
    });

    it('does not change plan when expiration_at_ms is absent', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      setupWebhookTransaction(user);
      const planBefore = user.subscriptionPlan;

      await service.processWebhook(
        makeWebhookPayload('BILLING_ISSUE', { expiration_at_ms: undefined }),
      );

      expect(user.subscriptionPlan).toBe(planBefore);
    });
  });

  describe('processWebhook — entitlement filtering', () => {
    it('ignores event without premium entitlement_ids', async () => {
      const user = makeMockUser();

      await service.processWebhook(
        makeWebhookPayload('INITIAL_PURCHASE', {
          entitlement_ids: ['other_entitlement'],
          entitlement_id: undefined,
          product_id: undefined,
        }),
      );

      expect(mockEm.transactional).not.toHaveBeenCalled();
      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
    });

    it('ignores event when entitlement_ids is empty array', async () => {
      await service.processWebhook(
        makeWebhookPayload('INITIAL_PURCHASE', {
          entitlement_ids: [],
          entitlement_id: undefined,
          product_id: undefined,
        }),
      );

      expect(mockEm.transactional).not.toHaveBeenCalled();
    });

    it('accepts event when entitlement_id=premium (no entitlement_ids array)', async () => {
      const user = makeMockUser();
      setupWebhookTransaction(user);

      await service.processWebhook(
        makeWebhookPayload('INITIAL_PURCHASE', {
          entitlement_ids: undefined,
          entitlement_id: 'premium',
        }),
      );

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
    });

    it('accepts event when product_id starts with warzywnik_premium', async () => {
      const user = makeMockUser();
      setupWebhookTransaction(user);

      await service.processWebhook(
        makeWebhookPayload('INITIAL_PURCHASE', {
          entitlement_ids: undefined,
          entitlement_id: undefined,
          product_id: 'warzywnik_premium:monthly',
        }),
      );

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
    });
  });

  describe('processWebhook — idempotency', () => {
    it('ignores duplicate event (same eventId) without modifying user', async () => {
      const existingEvent = new RevenueCatEvent();
      existingEvent.eventId = 'event-id-001';

      const user = makeMockUser();
      setupWebhookTransaction(user, existingEvent);

      const planBefore = user.subscriptionPlan;
      await service.processWebhook(makeWebhookPayload('INITIAL_PURCHASE'));

      expect(user.subscriptionPlan).toBe(planBefore);
    });
  });

  describe('processWebhook — user not found', () => {
    it('resolves without error and still commits event record', async () => {
      setupWebhookTransaction(null);

      await expect(
        service.processWebhook(makeWebhookPayload('INITIAL_PURCHASE')),
      ).resolves.not.toThrow();

      expect(mockEm.transactional).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // syncSubscription — RevenueCat REST API V2
  // ══════════════════════════════════════════════════════════════════════════

  describe('syncSubscription', () => {
    it('sets Premium when RevenueCat V2 returns active premium entitlement', async () => {
      const user = makeMockUser();
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'premium',
        isPremium: true,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      setupV2Fetch({
        activeItems: [
          {
            entitlement_id: MOCK_PREMIUM_ENTITLEMENT_ID,
            expires_at: FUTURE_MS,
          },
        ],
      });

      const result = await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result.plan).toBe('premium');
    });

    it('sets Free when RevenueCat V2 returns no active premium entitlement', async () => {
      const user = makeMockUser({
        subscriptionPlan: SubscriptionPlan.PREMIUM,
        subscriptionExpiresAt: FUTURE_DATE,
      });
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'free',
        isPremium: false,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      setupV2Fetch({ activeItems: [] });

      await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(user.subscriptionExpiresAt).toBeNull();
    });

    it('sets Free when active_entitlements contains a different entitlement only', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'free',
        isPremium: false,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      setupV2Fetch({
        activeItems: [
          { entitlement_id: 'entla_other_entitlement', expires_at: FUTURE_MS },
        ],
      });

      await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(user.subscriptionExpiresAt).toBeNull();
    });

    it('does not reset trial fields when setting Free', async () => {
      const trialStart = new Date('2025-06-01');
      const trialEnd = new Date('2025-06-08');
      const user = makeMockUser({
        subscriptionPlan: SubscriptionPlan.PREMIUM,
        trialStartedAt: trialStart,
        trialEndsAt: trialEnd,
      });
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'free',
        isPremium: false,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      setupV2Fetch({ activeItems: [] });

      await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(user.trialStartedAt).toEqual(trialStart);
      expect(user.trialEndsAt).toEqual(trialEnd);
    });

    it('sets Premium and does not change subscriptionExpiresAt when expires_at is null', async () => {
      const existingExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const user = makeMockUser({
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionExpiresAt: existingExpiry,
      });
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'premium',
        isPremium: true,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      setupV2Fetch({
        activeItems: [
          { entitlement_id: MOCK_PREMIUM_ENTITLEMENT_ID, expires_at: null },
        ],
      });

      await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      // subscriptionExpiresAt must not be overwritten with null or a bogus value
      expect(user.subscriptionExpiresAt).toEqual(existingExpiry);
    });

    it('throws BadGatewayException when env vars are not set', async () => {
      delete process.env.REVENUECAT_SECRET_API_KEY;
      delete process.env.REVENUECAT_PROJECT_ID;

      const user = makeMockUser();
      mockEm.findOne.mockResolvedValue(user);

      await expect(service.syncSubscription('user-uuid-123')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when entitlements endpoint returns non-ok status', async () => {
      const user = makeMockUser();
      mockEm.findOne.mockResolvedValue(user);

      setupV2Fetch({ entitlementsOk: false });

      await expect(service.syncSubscription('user-uuid-123')).rejects.toThrow(
        BadGatewayException,
      );
      // User plan must not be changed on API error
      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
    });

    it('throws BadGatewayException when active_entitlements endpoint returns non-ok status', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      mockEm.findOne.mockResolvedValue(user);

      setupV2Fetch({ activeOk: false });

      await expect(service.syncSubscription('user-uuid-123')).rejects.toThrow(
        BadGatewayException,
      );
      // User plan must not be changed on API error
      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
    });

    it('throws BadGatewayException on network error without changing user plan', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      mockEm.findOne.mockResolvedValue(user);

      setupV2Fetch({ networkError: true });

      await expect(service.syncSubscription('user-uuid-123')).rejects.toThrow(
        BadGatewayException,
      );
      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('uses cached premium entitlement ID on second call (only 1 extra fetch)', async () => {
      const user = makeMockUser();
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'premium',
        isPremium: true,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      // First call: 2 fetches (entitlements + active_entitlements)
      setupV2Fetch({
        activeItems: [
          {
            entitlement_id: MOCK_PREMIUM_ENTITLEMENT_ID,
            expires_at: FUTURE_MS,
          },
        ],
      });
      await service.syncSubscription('user-uuid-123');
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Second call: only 1 fetch (active_entitlements) — cache hit
      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          object: 'list',
          items: [
            {
              entitlement_id: MOCK_PREMIUM_ENTITLEMENT_ID,
              expires_at: FUTURE_MS,
            },
          ],
          next_page: null,
        }),
      } as unknown as Response);

      await service.syncSubscription('user-uuid-123');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
