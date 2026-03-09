import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ActionTask } from './action-task.entity';
import { ActionTasksService } from './action-tasks.service';
import { ActionTasksController } from './action-tasks.controller';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';
import { RemindersModule } from '../reminders/reminders.module';
import { ActionAutomationService } from './action-automation.service';
import { VegetableActionRule } from '../vegetables/vegetable-action-rule.entity';
import { PlantingInsightsModule } from '../planting-insights/planting-insights.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      ActionTask,
      ActionTemplate,
      Planting,
      Bed,
      VegetableActionRule,
    ]),
    RemindersModule,
    PlantingInsightsModule,
  ],
  providers: [ActionTasksService, ActionAutomationService],
  controllers: [ActionTasksController],
  exports: [ActionTasksService, ActionAutomationService],
})
export class ActionTasksModule {}
