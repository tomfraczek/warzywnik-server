import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VegetableTranslation } from '../entities/vegetable-translation.entity';
import { Vegetable } from '../entities/vegetable.entity';
import { VegetableTranslationService } from './vegetable-translation.service';
import { VegetableTranslationController } from './vegetable-translation.controller';

@Module({
  imports: [MikroOrmModule.forFeature([VegetableTranslation, Vegetable])],
  controllers: [VegetableTranslationController],
  providers: [VegetableTranslationService],
})
export class VegetableTranslationModule {}
