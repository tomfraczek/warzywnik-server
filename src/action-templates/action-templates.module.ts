import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ActionTemplate } from './action-template.entity';
import { ActionTemplatesController } from './action-templates.controller';
import { ActionTemplatesService } from './action-templates.service';
import { ActionTemplatesSeedService } from './action-templates.seed.service';

@Module({
  imports: [MikroOrmModule.forFeature([ActionTemplate])],
  controllers: [ActionTemplatesController],
  providers: [ActionTemplatesService, ActionTemplatesSeedService],
})
export class ActionTemplatesModule {}
