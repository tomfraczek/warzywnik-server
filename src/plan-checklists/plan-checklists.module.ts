import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PlanChecklistTemplate } from './plan-checklist-template.entity';
import { PlanChecklistItem } from './plan-checklist-item.entity';
import { PlanChecklistsService } from './plan-checklists.service';
import { PlanChecklistsController } from './plan-checklists.controller';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { Soil } from '../soils/soil.entity';
import { FertilizerType } from '../fertilizers/fertilizer-type.entity';
import { User } from '../users/user.entity';
import { PlanChecklistTemplatesSeedService } from './plan-checklist-templates.seed.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      PlanChecklistTemplate,
      PlanChecklistItem,
      Bed,
      Planting,
      Vegetable,
      Soil,
      FertilizerType,
      User,
    ]),
  ],
  providers: [PlanChecklistsService, PlanChecklistTemplatesSeedService],
  controllers: [PlanChecklistsController],
  exports: [PlanChecklistsService],
})
export class PlanChecklistsModule {}
