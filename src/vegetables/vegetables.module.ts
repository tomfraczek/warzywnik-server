import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Vegetable } from './entities/vegetable.entity';
import { VegetableTranslation } from './entities/vegetable-translation.entity';
import { VegetablesService } from './vegetables.service';
import { VegetablesController } from './vegetables.controller';
import { Soil } from '../soil/entities/soil.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Vegetable, VegetableTranslation, Soil])],
  controllers: [VegetablesController],
  providers: [VegetablesService],
})
export class VegetablesModule {}
