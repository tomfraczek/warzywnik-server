import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { RevenueCatEvent } from './revenuecat-event.entity';
import {
  EntitlementsResult,
  EntitlementsService,
} from '../entitlements/entitlements.service';
import { SubscriptionPlan } from '../common/enums/user.enums';

const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';
const PREMIUM_ENTITLEMENT_ID = 'premium';
const PREMIUM_PRODUCT_PREFIX = 'warzywnik_premium';

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

type RevenueCatSubscriberResponse = {
  subscriber: {
    entitlements: Record<
      string,
      {
        expires_date: string | null;
        product_identifier: string;
        purchase_date: string;
      }
    >;
  };
};

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly entitlementsService: EntitlementsService,
  ) {}

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
        // rcEvent is still committed for audit — webhook won't be retried for this event
        return;
      }

      this.applyEventToUser(user, event, eventType);
    });
  }

  async syncSubscription(userId: string): Promise<EntitlementsResult> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
    if (!apiKey) {
      this.logger.error(
        'RevenueCat sync failed: REVENUECAT_SECRET_API_KEY is not set',
      );
      throw new BadGatewayException('RevenueCat API key not configured');
    }

    try {
      const response = await fetch(
        `${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        this.logger.error(
          `RevenueCat API error: status=${response.status} userId=${userId}`,
        );
        throw new BadGatewayException(
          `RevenueCat API returned ${response.status}`,
        );
      }

      const data = (await response.json()) as RevenueCatSubscriberResponse;
      const premiumEntitlement =
        data.subscriber.entitlements[PREMIUM_ENTITLEMENT_ID];
      const now = new Date();

      const isActive =
        premiumEntitlement != null &&
        (premiumEntitlement.expires_date == null ||
          new Date(premiumEntitlement.expires_date) > now);

      if (isActive) {
        user.subscriptionPlan = SubscriptionPlan.PREMIUM;
        user.subscriptionExpiresAt = premiumEntitlement.expires_date
          ? new Date(premiumEntitlement.expires_date)
          : null;
        this.logger.log(
          `RevenueCat sync: set Premium userId=${userId} expiresAt=${user.subscriptionExpiresAt?.toISOString()}`,
        );
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

  private isPremiumEvent(event: RevenueCatWebhookEvent): boolean {
    if (Array.isArray(event.entitlement_ids)) {
      return event.entitlement_ids.includes(PREMIUM_ENTITLEMENT_ID);
    }
    if (event.entitlement_id) {
      return event.entitlement_id === PREMIUM_ENTITLEMENT_ID;
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
      event.expiration_at_ms != null
        ? new Date(event.expiration_at_ms)
        : null;

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
        // User cancelled auto-renewal but retains access until expiration
        user.subscriptionPlan = SubscriptionPlan.PREMIUM;
        if (expiresAt) {
          user.subscriptionExpiresAt = expiresAt;
        }
        this.logger.log(
          `RevenueCat: cancellation (access until expiry) userId=${user.id} expiresAt=${expiresAt?.toISOString()}`,
        );
        break;

      case 'BILLING_ISSUE':
        // Do not revoke immediately — keep premium until expiration
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
