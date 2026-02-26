import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Planting } from './planting.entity';
import { PlantingsService } from './plantings.service';
import { PlantingsController } from './plantings.controller';
import { Bed } from '../beds/bed.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { WarningRulesModule } from '../warning-rules/warning-rules.module';
import { ActionTasksModule } from '../action-tasks/action-tasks.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Planting, Bed, Vegetable]),
    WarningRulesModule,
    ActionTasksModule,
  ],
  providers: [PlantingsService],
  controllers: [PlantingsController],
  exports: [PlantingsService],
})
export class PlantingsModule {}
