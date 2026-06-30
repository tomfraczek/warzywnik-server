import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RevenueCatEvent } from './revenuecat-event.entity';
import { RevenueCatService } from './revenuecat.service';
import { RevenueCatController } from './revenuecat.controller';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { User } from '../users/user.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([RevenueCatEvent, User]),
    EntitlementsModule,
  ],
  controllers: [RevenueCatController],
  providers: [RevenueCatService],
  exports: [RevenueCatService],
})
export class RevenueCatModule {}
