import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PestOccurrence } from './pest-occurrence.entity';
import { PestOccurrencesService } from './pest-occurrences.service';
import { PestOccurrencesController } from './pest-occurrences.controller';
import { Planting } from '../plantings/planting.entity';
import { Pest } from '../pests/pest.entity';
import { RemindersModule } from '../reminders/reminders.module';
import { PlantingInsightsModule } from '../planting-insights/planting-insights.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([PestOccurrence, Planting, Pest]),
    RemindersModule,
    PlantingInsightsModule,
  ],
  providers: [PestOccurrencesService],
  controllers: [PestOccurrencesController],
})
export class PestOccurrencesModule {}
