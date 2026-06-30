import { Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
import { SubscriptionPlan } from '../common/enums/user.enums';

export type EntitlementSource = 'subscription' | 'trial' | 'free';

export type PlanLimits = {
  beds: number | null;
  activePlantings: number | null;
  notes: number | null;
};

export type PlanFeatures = {
  fullArticles: boolean;
  gardenPlanner: boolean;
  seasonStatistics: boolean;
  cropDiseaseHistory: boolean;
  cropPestHistory: boolean;
  advancedNotifications: boolean;
  postHarvestSuggestions: boolean;
  weatherBasedTasks: boolean;
  growthStageTasks: boolean;
};

export type EntitlementsResult = {
  plan: 'free' | 'premium';
  source: EntitlementSource;
  isPremium: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  subscriptionExpiresAt: Date | null;
  limits: PlanLimits;
  features: PlanFeatures;
};

const PREMIUM_LIMITS: PlanLimits = {
  beds: null,
  activePlantings: null,
  notes: null,
};

const FREE_LIMITS: PlanLimits = {
  beds: 1,
  activePlantings: 5,
  notes: 5,
};

const PREMIUM_FEATURES: PlanFeatures = {
  fullArticles: true,
  gardenPlanner: true,
  seasonStatistics: true,
  cropDiseaseHistory: true,
  cropPestHistory: true,
  advancedNotifications: true,
  postHarvestSuggestions: true,
  weatherBasedTasks: true,
  growthStageTasks: true,
};

const FREE_FEATURES: PlanFeatures = {
  fullArticles: false,
  gardenPlanner: false,
  seasonStatistics: false,
  cropDiseaseHistory: false,
  cropPestHistory: false,
  advancedNotifications: false,
  postHarvestSuggestions: false,
  weatherBasedTasks: false,
  growthStageTasks: false,
};

@Injectable()
export class EntitlementsService {
  resolveSource(user: User, now: Date = new Date()): EntitlementSource {
    const hasActiveSub =
      user.subscriptionPlan === SubscriptionPlan.PREMIUM &&
      user.subscriptionExpiresAt != null &&
      user.subscriptionExpiresAt > now;

    if (hasActiveSub) {
      return 'subscription';
    }

    const hasActiveTrial = user.trialEndsAt != null && user.trialEndsAt > now;

    if (hasActiveTrial) {
      return 'trial';
    }

    return 'free';
  }

  isPremium(user: User, now: Date = new Date()): boolean {
    return this.resolveSource(user, now) !== 'free';
  }

  getEntitlements(user: User): EntitlementsResult {
    const now = new Date();
    const source = this.resolveSource(user, now);
    const isPremium = source !== 'free';

    return {
      plan: isPremium ? 'premium' : 'free',
      source,
      isPremium,
      trialStartedAt: user.trialStartedAt ?? null,
      trialEndsAt: user.trialEndsAt ?? null,
      subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
      limits: isPremium ? PREMIUM_LIMITS : FREE_LIMITS,
      features: isPremium ? PREMIUM_FEATURES : FREE_FEATURES,
    };
  }

  getLimits(user: User): PlanLimits {
    return this.isPremium(user) ? PREMIUM_LIMITS : FREE_LIMITS;
  }
}
