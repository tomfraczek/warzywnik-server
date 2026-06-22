import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BedsController } from './beds.controller';
import { BedsService } from './beds.service';
import { Bed } from './bed.entity';
import { Soil } from '../soils/soil.entity';
import { WeatherModule } from '../weather/weather.module';
import { GrowingSpace } from '../growing-spaces/growing-space.entity';
import { PlantingInsightsModule } from '../planting-insights/planting-insights.module';
import { ActionTasksModule } from '../action-tasks/action-tasks.module';
import { PlanChecklistsModule } from '../plan-checklists/plan-checklists.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Bed, Soil, GrowingSpace]),
    WeatherModule,
    PlantingInsightsModule,
    ActionTasksModule,
    PlanChecklistsModule,
    EntitlementsModule,
  ],
  controllers: [BedsController],
  providers: [BedsService],
  exports: [BedsService],
})
export class BedsModule {}
