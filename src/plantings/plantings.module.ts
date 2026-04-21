import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Planting } from './planting.entity';
import { HarvestResult } from './harvest-result.entity';
import { PlantingsService } from './plantings.service';
import { PlantingsController } from './plantings.controller';
import { Bed } from '../beds/bed.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { WarningRulesModule } from '../warning-rules/warning-rules.module';
import { ActionTasksModule } from '../action-tasks/action-tasks.module';
import { PlantingInsightsModule } from '../planting-insights/planting-insights.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Planting, HarvestResult, Bed, Vegetable]),
    WarningRulesModule,
    ActionTasksModule,
    PlantingInsightsModule,
    AnalyticsModule,
  ],
  providers: [PlantingsService],
  controllers: [PlantingsController],
  exports: [PlantingsService],
})
export class PlantingsModule {}
