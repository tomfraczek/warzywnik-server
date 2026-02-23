import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { ActionTask } from '../action-tasks/action-task.entity';
import { Planting } from '../plantings/planting.entity';
import { Reminder } from '../reminders/reminder.entity';

@Module({
  imports: [MikroOrmModule.forFeature([ActionTask, Planting, Reminder])],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
