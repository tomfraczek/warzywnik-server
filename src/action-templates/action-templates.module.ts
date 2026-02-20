import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ActionTemplate } from './action-template.entity';
import { ActionTemplatesController } from './action-templates.controller';
import { ActionTemplatesService } from './action-templates.service';

@Module({
  imports: [MikroOrmModule.forFeature([ActionTemplate])],
  controllers: [ActionTemplatesController],
  providers: [ActionTemplatesService],
})
export class ActionTemplatesModule {}
