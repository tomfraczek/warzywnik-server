import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ActionTask } from './action-task.entity';
import { ActionTasksService } from './action-tasks.service';
import { ActionTasksController } from './action-tasks.controller';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([ActionTask, ActionTemplate, Planting, Bed]),
  ],
  providers: [ActionTasksService],
  controllers: [ActionTasksController],
})
export class ActionTasksModule {}
