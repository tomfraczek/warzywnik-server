import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VegetablesController } from './vegetables.controller';
import { VegetablesService } from './vegetables.service';
import { Vegetable } from './vegetable.entity';
import { Pest } from '../pests/pest.entity';
import { Disease } from '../diseases/disease.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Vegetable, Pest, Disease])],
  controllers: [VegetablesController],
  providers: [VegetablesService],
})
export class VegetablesModule {}
