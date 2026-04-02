import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VegetablesController } from './vegetables.controller';
import { VegetablesService } from './vegetables.service';
import { Vegetable } from './vegetable.entity';
import { Pest } from '../pests/pest.entity';
import { Disease } from '../diseases/disease.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { VegetableActionRule } from './vegetable-action-rule.entity';
import { VegetablesSeedService } from './vegetables.seed.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Vegetable,
      Pest,
      Disease,
      ActionTemplate,
      VegetableActionRule,
    ]),
  ],
  controllers: [VegetablesController],
  providers: [VegetablesService, VegetablesSeedService],
  exports: [VegetablesService],
})
export class VegetablesModule {}
