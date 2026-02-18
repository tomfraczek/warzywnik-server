import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PestOccurrence } from './pest-occurrence.entity';
import { PestOccurrencesService } from './pest-occurrences.service';
import { PestOccurrencesController } from './pest-occurrences.controller';
import { Bed } from '../beds/bed.entity';
import { Pest } from '../pests/pest.entity';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([PestOccurrence, Bed, Pest]),
    RemindersModule,
  ],
  providers: [PestOccurrencesService],
  controllers: [PestOccurrencesController],
})
export class PestOccurrencesModule {}
