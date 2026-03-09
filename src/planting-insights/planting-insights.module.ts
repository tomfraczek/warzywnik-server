import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PlantingInsightsService } from './planting-insights.service';
import { PlantingInsightsController } from './planting-insights.controller';
import { PlantingEvent } from './planting-event.entity';
import { PlantingSeasonSummary } from './planting-season-summary.entity';

@Module({
  imports: [MikroOrmModule.forFeature([PlantingEvent, PlantingSeasonSummary])],
  providers: [PlantingInsightsService],
  controllers: [PlantingInsightsController],
  exports: [PlantingInsightsService],
})
export class PlantingInsightsModule {}
