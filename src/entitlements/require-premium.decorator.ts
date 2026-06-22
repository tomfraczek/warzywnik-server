import { SetMetadata } from '@nestjs/common';

export const PREMIUM_FEATURE_KEY = 'premiumFeature';

export const RequirePremium = (feature: string) =>
  SetMetadata(PREMIUM_FEATURE_KEY, feature);
