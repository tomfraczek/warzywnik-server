import { Module } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { PremiumGuard } from './premium.guard';

@Module({
  providers: [EntitlementsService, PremiumGuard],
  exports: [EntitlementsService, PremiumGuard],
})
export class EntitlementsModule {}
