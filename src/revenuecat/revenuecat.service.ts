import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { RevenueCatEvent } from './revenuecat-event.entity';
import {
  EntitlementsResult,
  EntitlementsService,
} from '../entitlements/entitlements.service';
import { SubscriptionPlan } from '../common/enums/user.enums';

const REVENUECAT_V2_URL = 'https://api.revenuecat.com/v2';
const PREMIUM_LOOKUP_KEY = 'premium';
const PREMIUM_PRODUCT_PREFIX = 'warzywnik_premium';

// ─── Webhook types (unchanged — webhook payload is V1/V2 agnostic) ──────────

export type RevenueCatWebhookEvent = {
  id?: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  product_id?: string;
  entitlement_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
  transaction_id?: string;
  environment?: string;
  store?: string;
  [key: string]: unknown;
};

export type RevenueCatWebhookPayload = {
  api_version?: string;
  event: RevenueCatWebhookEvent;
};

// ─── RevenueCat REST API V2 types ────────────────────────────────────────────

type RcV2EntitlementItem = {
  object: 'entitlement';
  id: string;
  lookup_key: string;
  display_name: string;
  project_id: string;
  created_at: number;
};

type RcV2EntitlementsListResponse = {
  object: 'list';
  items: RcV2EntitlementItem[];
  next_page: string | null;
};

type RcV2ActiveEntitlementItem = {
  object: 'customer.active_entitlement';
  entitlement_id: string;
  expires_at: number | null;
};

type RcV2ActiveEntitlementsResponse = {
  object: 'list';
  items: RcV2ActiveEntitlementItem[];
  next_page: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  /**
   * Cached internal RevenueCat entitlement ID for the "premium" lookup_key.
   * Populated lazily on the first sync call. Cleared on service restart.
   */
  private premiumEntitlementIdCache: string | null = null;

  constructor(
    private readonly em: EntityManager,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  // ─── Webhook ──────────────────────────────────────────────────────────────

  async processWebhook(payload: RevenueCatWebhookPayload): Promise<void> {
    const event = payload.event;
    const eventType = event.type;

    this.logger.log(
      `RevenueCat webhook: type=${eventType} appUserId=${event.app_user_id}`,
    );

    if (!this.isPremiumEvent(event)) {
      this.logger.log(
        `RevenueCat webhook skipped (not premium): type=${eventType} appUserId=${event.app_user_id}`,
      );
      return;
    }

    const eventId = this.resolveEventId(event);

    await this.em.transactional(async (em) => {
      const existing = await em.findOne(RevenueCatEvent, { eventId });
      if (existing) {
        this.logger.log(
          `RevenueCat webhook duplicate (already processed): eventId=${eventId} type=${eventType}`,
        );
        return;
      }

      const rcEvent = new RevenueCatEvent();
      rcEvent.eventId = eventId;
      rcEvent.appUserId = event.app_user_id;
      rcEvent.eventType = eventType;
      rcEvent.rawPayload = payload as object;
      rcEvent.processedAt = new Date();
      em.persist(rcEvent);

      const user = await em.findOne(User, { id: event.app_user_id });
      if (!user) {
        this.logger.warn(
          `RevenueCat webhook: user not found appUserId=${event.app_user_id} type=${eventType}`,
        );
        return;
      }

      this.applyEventToUser(user, event, eventType);
    });
  }

  // ─── Manual sync (uses RevenueCat REST API V2) ────────────────────────────

  async syncSubscription(userId: string): Promise<EntitlementsResult> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
    const projectId = process.env.REVENUECAT_PROJECT_ID;

    if (!apiKey || !projectId) {
      this.logger.error(
        'RevenueCat sync failed: REVENUECAT_SECRET_API_KEY or REVENUECAT_PROJECT_ID is not set',
      );
      throw new BadGatewayException('RevenueCat is not configured');
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      const premiumEntitlementId = await this.resolvePremiumEntitlementId(
        projectId,
        headers,
      );

      const activeResponse = await fetch(
        `${REVENUECAT_V2_URL}/projects/${projectId}/customers/${encodeURIComponent(userId)}/active_entitlements?limit=100`,
        { headers },
      );

      if (!activeResponse.ok) {
        this.logger.error(
          `RevenueCat V2 active_entitlements error: status=${activeResponse.status} userId=${userId}`,
        );
        throw new BadGatewayException(
          `RevenueCat API returned ${activeResponse.status}`,
        );
      }

      const activeData =
        (await activeResponse.json()) as RcV2ActiveEntitlementsResponse;

      const premiumEntry = activeData.items.find(
        (e) => e.entitlement_id === premiumEntitlementId,
      );

      if (premiumEntry) {
        user.subscriptionPlan = SubscriptionPlan.PREMIUM;

        if (premiumEntry.expires_at != null) {
          user.subscriptionExpiresAt = new Date(premiumEntry.expires_at);
          this.logger.log(
            `RevenueCat sync: set Premium userId=${userId} expiresAt=${user.subscriptionExpiresAt.toISOString()}`,
          );
        } else {
          // Lifetime or promotional entitlement — no expiry date available.
          // Keep subscriptionPlan=PREMIUM but leave subscriptionExpiresAt unchanged
          // to avoid creating a bogus date. A webhook should eventually provide the date.
          this.logger.warn(
            `RevenueCat sync: premium entitlement is active but expires_at is null for userId=${userId}. subscriptionExpiresAt not changed.`,
          );
        }
      } else {
        user.subscriptionPlan = SubscriptionPlan.FREE;
        user.subscriptionExpiresAt = null;
        this.logger.log(`RevenueCat sync: set Free userId=${userId}`);
      }

      await this.em.flush();
    } catch (err: unknown) {
      if (err instanceof BadGatewayException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `RevenueCat sync error userId=${userId}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new BadGatewayException('RevenueCat API is unavailable');
    }

    return this.entitlementsService.getEntitlements(user);
  }

  // ─── Dev mock ─────────────────────────────────────────────────────────────

  buildMockPayload(
    type: string,
    userId: string,
    expirationDays: number,
  ): RevenueCatWebhookPayload {
    const expirationMs =
      type === 'EXPIRATION'
        ? undefined
        : Date.now() + expirationDays * 24 * 60 * 60 * 1000;

    return {
      api_version: '1.0',
      event: {
        id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        app_user_id: userId,
        entitlement_ids: ['premium'],
        expiration_at_ms: expirationMs,
        transaction_id: `mock-txn-${Date.now()}`,
        event_timestamp_ms: Date.now(),
        environment: 'SANDBOX',
        store: 'PLAY_STORE',
        product_id: 'warzywnik_premium:monthly',
      },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Resolves the internal RevenueCat entitlement ID for the "premium" lookup_key.
   * The result is cached in-memory for the lifetime of the service instance.
   * Requires a restart to pick up changes in RevenueCat entitlement configuration.
   */
  private async resolvePremiumEntitlementId(
    projectId: string,
    headers: Record<string, string>,
  ): Promise<string> {
    if (this.premiumEntitlementIdCache) {
      return this.premiumEntitlementIdCache;
    }

    const response = await fetch(
      `${REVENUECAT_V2_URL}/projects/${projectId}/entitlements?limit=100`,
      { headers },
    );

    if (!response.ok) {
      this.logger.error(
        `RevenueCat V2 entitlements fetch failed: status=${response.status}`,
      );
      throw new BadGatewayException(
        `RevenueCat entitlements API returned ${response.status}`,
      );
    }

    const data = (await response.json()) as RcV2EntitlementsListResponse;
    const premium = data.items.find((e) => e.lookup_key === PREMIUM_LOOKUP_KEY);

    if (!premium) {
      this.logger.error(
        `RevenueCat: entitlement with lookup_key="${PREMIUM_LOOKUP_KEY}" not found in project ${projectId}`,
      );
      throw new BadGatewayException(
        `RevenueCat entitlement "${PREMIUM_LOOKUP_KEY}" not found in project`,
      );
    }

    this.logger.log(
      `RevenueCat: resolved premium entitlement id=${premium.id} (cached)`,
    );
    this.premiumEntitlementIdCache = premium.id;
    return premium.id;
  }

  private isPremiumEvent(event: RevenueCatWebhookEvent): boolean {
    if (Array.isArray(event.entitlement_ids)) {
      return event.entitlement_ids.includes(PREMIUM_LOOKUP_KEY);
    }
    if (event.entitlement_id) {
      return event.entitlement_id === PREMIUM_LOOKUP_KEY;
    }
    if (event.product_id) {
      return event.product_id.startsWith(PREMIUM_PRODUCT_PREFIX);
    }
    return false;
  }

  private resolveEventId(event: RevenueCatWebhookEvent): string {
    if (event.id) {
      return event.id;
    }
    // Fallback for payloads missing the id field (should not happen in practice).
    // RevenueCat always sends a stable UUID in event.id.
    return [
      event.type,
      event.app_user_id,
      event.transaction_id ?? '',
      String(event.event_timestamp_ms ?? ''),
    ].join(':');
  }

  private applyEventToUser(
    user: User,
    event: RevenueCatWebhookEvent,
    eventType: string,
  ): void {
    const expiresAt =
      event.expiration_at_ms != null ? new Date(event.expiration_at_ms) : null;

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        user.subscriptionPlan = SubscriptionPlan.PREMIUM;
        user.subscriptionExpiresAt = expiresAt;
        this.logger.log(
          `RevenueCat: updated subscription userId=${user.id} plan=premium expiresAt=${expiresAt?.toISOString()} event=${eventType}`,
        );
        break;

      case 'PRODUCT_CHANGE':
        user.subscriptionPlan = SubscriptionPlan.PREMIUM;
        if (expiresAt) {
          user.subscriptionExpiresAt = expiresAt;
        }
        this.logger.log(
          `RevenueCat: updated subscription userId=${user.id} plan=premium expiresAt=${expiresAt?.toISOString()} event=${eventType}`,
        );
        break;

      case 'CANCELLATION':
        user.subscriptionPlan = SubscriptionPlan.PREMIUM;
        if (expiresAt) {
          user.subscriptionExpiresAt = expiresAt;
        }
        this.logger.log(
          `RevenueCat: cancellation (access until expiry) userId=${user.id} expiresAt=${expiresAt?.toISOString()}`,
        );
        break;

      case 'BILLING_ISSUE':
        if (expiresAt) {
          user.subscriptionPlan = SubscriptionPlan.PREMIUM;
          user.subscriptionExpiresAt = expiresAt;
          this.logger.log(
            `RevenueCat: billing issue (access until expiry) userId=${user.id} expiresAt=${expiresAt.toISOString()}`,
          );
        }
        break;

      case 'EXPIRATION':
        user.subscriptionPlan = SubscriptionPlan.FREE;
        user.subscriptionExpiresAt = null;
        this.logger.log(`RevenueCat: expiration — set Free userId=${user.id}`);
        break;

      default:
        this.logger.log(
          `RevenueCat: unhandled event type=${eventType} userId=${user.id}`,
        );
        break;
    }
  }
}
