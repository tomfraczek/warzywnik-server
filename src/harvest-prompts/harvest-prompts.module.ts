import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HarvestPromptsController } from './harvest-prompts.controller';
import { HarvestPromptsService } from './harvest-prompts.service';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';
import { HarvestPromptState } from './harvest-prompt-state.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Bed,
      Planting,
      HarvestPromptState,
      ActionTemplate,
    ]),
  ],
  controllers: [HarvestPromptsController],
  providers: [HarvestPromptsService],
})
export class HarvestPromptsModule {}
