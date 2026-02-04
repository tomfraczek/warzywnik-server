import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Planting } from './planting.entity';
import { PlantingsService } from './plantings.service';
import { PlantingsController } from './plantings.controller';
import { Bed } from '../beds/bed.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { WarningRulesModule } from '../warning-rules/warning-rules.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Planting, Bed, Vegetable]),
    WarningRulesModule,
  ],
  providers: [PlantingsService],
  controllers: [PlantingsController],
})
export class PlantingsModule {}
