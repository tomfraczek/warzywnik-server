import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from './user.entity';
import { PremiumTrialClaim } from './premium-trial-claim.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersAdminService } from './users-admin.service';
import { UsersAdminController } from './users-admin.controller';
import { Location } from '../locations/location.entity';
import { LocationsModule } from '../locations/locations.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, Location, PremiumTrialClaim]),
    LocationsModule,
    EntitlementsModule,
  ],
  providers: [UsersService, UsersAdminService],
  controllers: [UsersController, UsersAdminController],
  exports: [UsersService],
})
export class UsersModule {}
