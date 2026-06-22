import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PlantingDisease } from './planting-disease.entity';
import { PlantingDiseasesService } from './planting-diseases.service';
import { PlantingDiseasesController } from './planting-diseases.controller';
import { Planting } from '../plantings/planting.entity';
import { Disease } from '../diseases/disease.entity';
import { RemindersModule } from '../reminders/reminders.module';
import { PlantingInsightsModule } from '../planting-insights/planting-insights.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([PlantingDisease, Planting, Disease]),
    RemindersModule,
    PlantingInsightsModule,
    EntitlementsModule,
  ],
  providers: [PlantingDiseasesService],
  controllers: [PlantingDiseasesController],
})
export class PlantingDiseasesModule {}
