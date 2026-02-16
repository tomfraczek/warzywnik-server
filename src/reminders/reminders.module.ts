import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { Reminder } from './reminder.entity';
import { User } from '../users/user.entity';
import { PushWorkerService } from './push-worker.service';

@Module({
  imports: [MikroOrmModule.forFeature([Reminder, User])],
  controllers: [RemindersController],
  providers: [RemindersService, PushWorkerService],
  exports: [RemindersService],
})
export class RemindersModule {}
