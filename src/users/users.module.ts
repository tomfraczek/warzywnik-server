import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Location } from '../locations/location.entity';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [MikroOrmModule.forFeature([User, Location]), LocationsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
