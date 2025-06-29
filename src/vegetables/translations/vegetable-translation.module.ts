import { Module } from '@nestjs/common';
import { VegetableTranslationController } from './vegetable-translation.controller';
import { VegetableTranslationService } from './vegetable-translation.service';

@Module({
  controllers: [VegetableTranslationController],
  providers: [VegetableTranslationService],
})
export class VegetableTranslationModule {}
