import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SoilTranslation } from './entities/soil-translation.entity';
import { SoilTranslationController } from './soil-translation.controller';
import { SoilTranslationService } from './soil-translation.service';
import { Soil } from '../entities/soil.entity';

@Module({
  imports: [MikroOrmModule.forFeature([SoilTranslation, Soil])],
  controllers: [SoilTranslationController],
  providers: [SoilTranslationService],
  exports: [SoilTranslationService],
})
export class SoilTranslationModule {}
