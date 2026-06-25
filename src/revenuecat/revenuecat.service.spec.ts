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

const makeMockUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  user.id = 'user-uuid-123';
  user.clerkUserId = 'clerk_abc';
  user.subscriptionPlan = SubscriptionPlan.FREE;
  user.subscriptionExpiresAt = null;
  user.trialStartedAt = new Date('2025-01-01');
  user.trialEndsAt = new Date('2025-01-04');
  return Object.assign(user, overrides);
};

const FUTURE_MS = Date.now() + 30 * 24 * 60 * 60 * 1000;
const FUTURE_DATE = new Date(FUTURE_MS);

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

describe('RevenueCatService', () => {
  let service: RevenueCatService;
  let mockEm: jest.Mocked<
    Pick<EntityManager, 'findOne' | 'persist' | 'flush' | 'persistAndFlush' | 'transactional'>
  >;
  let mockEntitlementsService: jest.Mocked<
    Pick<EntitlementsService, 'getEntitlements'>
  >;

  /**
   * Simulate em.transactional(): immediately calls the callback with the same
   * mock EM so we can assert on findOne/persist calls without a real DB.
   */
  const mockTransactional = (
    findOneSideEffect: (entityClass: unknown, where: unknown) => unknown,
  ) => {
    mockEm.transactional.mockImplementation(async (cb) => {
      const txEm = {
        ...mockEm,
        findOne: jest.fn().mockImplementation(findOneSideEffect),
        persist: jest.fn(),
      };
      return cb(txEm as unknown as EntityManager);
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
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.REVENUECAT_SECRET_API_KEY;
  });

  // --- helpers ---

  const setupTransaction = (user: User | null, existingEvent: RevenueCatEvent | null = null) => {
    mockTransactional((entityClass, where) => {
      if (entityClass === RevenueCatEvent) return Promise.resolve(existingEvent);
      if (entityClass === User) return Promise.resolve(user);
      return Promise.resolve(null);
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // INITIAL_PURCHASE
  // ──────────────────────────────────────────────────────────────────────────

  describe('processWebhook — INITIAL_PURCHASE', () => {
    it('sets subscriptionPlan=premium and subscriptionExpiresAt', async () => {
      const user = makeMockUser();
      setupTransaction(user);

      await service.processWebhook(makeWebhookPayload('INITIAL_PURCHASE'));

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
      expect(mockEm.transactional).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // RENEWAL
  // ──────────────────────────────────────────────────────────────────────────

  describe('processWebhook — RENEWAL', () => {
    it('extends subscriptionExpiresAt for premium', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      setupTransaction(user);

      await service.processWebhook(makeWebhookPayload('RENEWAL'));

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CANCELLATION
  // ──────────────────────────────────────────────────────────────────────────

  describe('processWebhook — CANCELLATION', () => {
    it('keeps plan=premium with updated expiry (no immediate revocation)', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      setupTransaction(user);

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
      setupTransaction(user);

      await service.processWebhook(
        makeWebhookPayload('CANCELLATION', { expiration_at_ms: undefined }),
      );

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(existingExpiry);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // EXPIRATION
  // ──────────────────────────────────────────────────────────────────────────

  describe('processWebhook — EXPIRATION', () => {
    it('sets subscriptionPlan=free and clears subscriptionExpiresAt', async () => {
      const user = makeMockUser({
        subscriptionPlan: SubscriptionPlan.PREMIUM,
        subscriptionExpiresAt: new Date(Date.now() - 1000),
      });
      setupTransaction(user);

      await service.processWebhook(makeWebhookPayload('EXPIRATION'));

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(user.subscriptionExpiresAt).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BILLING_ISSUE
  // ──────────────────────────────────────────────────────────────────────────

  describe('processWebhook — BILLING_ISSUE', () => {
    it('does not revoke premium when expiration_at_ms is in the future', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      setupTransaction(user);

      await service.processWebhook(
        makeWebhookPayload('BILLING_ISSUE', { expiration_at_ms: FUTURE_MS }),
      );

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
    });

    it('does not change plan when expiration_at_ms is absent', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      setupTransaction(user);

      const planBefore = user.subscriptionPlan;

      await service.processWebhook(
        makeWebhookPayload('BILLING_ISSUE', { expiration_at_ms: undefined }),
      );

      expect(user.subscriptionPlan).toBe(planBefore);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Entitlement filtering
  // ──────────────────────────────────────────────────────────────────────────

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
      setupTransaction(user);

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
      setupTransaction(user);

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

  // ──────────────────────────────────────────────────────────────────────────
  // Idempotency
  // ──────────────────────────────────────────────────────────────────────────

  describe('processWebhook — idempotency', () => {
    it('ignores duplicate event (same eventId) without modifying user', async () => {
      const existingEvent = new RevenueCatEvent();
      existingEvent.eventId = 'event-id-001';

      const user = makeMockUser();
      // duplicate found — user lookup never reached
      setupTransaction(user, existingEvent);

      const planBefore = user.subscriptionPlan;

      await service.processWebhook(makeWebhookPayload('INITIAL_PURCHASE'));

      expect(user.subscriptionPlan).toBe(planBefore);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // User not found
  // ──────────────────────────────────────────────────────────────────────────

  describe('processWebhook — user not found', () => {
    it('resolves without error and still commits event record', async () => {
      // user is null — setupTransaction with null user
      setupTransaction(null);

      await expect(
        service.processWebhook(makeWebhookPayload('INITIAL_PURCHASE')),
      ).resolves.not.toThrow();

      expect(mockEm.transactional).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // syncSubscription
  // ──────────────────────────────────────────────────────────────────────────

  describe('syncSubscription', () => {
    const setupFetch = (
      entitlements: Record<
        string,
        {
          expires_date: string | null;
          product_identifier: string;
          purchase_date: string;
        }
      >,
    ) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ subscriber: { entitlements } }),
      } as unknown as Response);
    };

    beforeEach(() => {
      process.env.REVENUECAT_SECRET_API_KEY = 'test-secret-key';
    });

    it('sets Premium when RevenueCat returns active premium entitlement', async () => {
      const user = makeMockUser();
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'premium',
        isPremium: true,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      setupFetch({
        premium: {
          expires_date: FUTURE_DATE.toISOString(),
          product_identifier: 'warzywnik_premium:monthly',
          purchase_date: new Date().toISOString(),
        },
      });

      const result = await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toEqual(FUTURE_DATE);
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result.plan).toBe('premium');
    });

    it('sets Free when RevenueCat returns no premium entitlement', async () => {
      const user = makeMockUser({
        subscriptionPlan: SubscriptionPlan.PREMIUM,
        subscriptionExpiresAt: FUTURE_DATE,
      });
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'free',
        isPremium: false,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      setupFetch({});

      await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(user.subscriptionExpiresAt).toBeNull();
    });

    it('sets Free when premium entitlement is expired', async () => {
      const user = makeMockUser({ subscriptionPlan: SubscriptionPlan.PREMIUM });
      mockEm.findOne.mockResolvedValue(user);
      mockEntitlementsService.getEntitlements.mockReturnValue({
        plan: 'free',
        isPremium: false,
      } as ReturnType<EntitlementsService['getEntitlements']>);

      const pastDate = new Date(Date.now() - 1000);
      setupFetch({
        premium: {
          expires_date: pastDate.toISOString(),
          product_identifier: 'warzywnik_premium:monthly',
          purchase_date: new Date().toISOString(),
        },
      });

      await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(user.subscriptionExpiresAt).toBeNull();
    });

    it('does not reset trial fields when setting Free', async () => {
      const trialStart = new Date('2025-06-01');
      const trialEnd = new Date('2025-06-04');
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

      setupFetch({});

      await service.syncSubscription('user-uuid-123');

      expect(user.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(user.trialStartedAt).toEqual(trialStart);
      expect(user.trialEndsAt).toEqual(trialEnd);
    });

    it('throws BadGatewayException when REVENUECAT_SECRET_API_KEY is not set', async () => {
      delete process.env.REVENUECAT_SECRET_API_KEY;

      const user = makeMockUser();
      mockEm.findOne.mockResolvedValue(user);

      await expect(service.syncSubscription('user-uuid-123')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when RevenueCat API returns non-ok status', async () => {
      const user = makeMockUser();
      mockEm.findOne.mockResolvedValue(user);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      } as unknown as Response);

      await expect(service.syncSubscription('user-uuid-123')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException on network error', async () => {
      const user = makeMockUser();
      mockEm.findOne.mockResolvedValue(user);

      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

      await expect(service.syncSubscription('user-uuid-123')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });
});
