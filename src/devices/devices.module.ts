import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { UserDevice } from './user-device.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [MikroOrmModule.forFeature([UserDevice, User])],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
