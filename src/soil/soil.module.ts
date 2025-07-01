import { Module } from '@nestjs/common';
import { SoilsService } from './soil.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SoilsController } from './soil.controller';
import { Soil } from './entities/soil.entity';

import { SoilTranslation } from './translations/entities/soil-translation.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Soil, SoilTranslation])],
  providers: [SoilsService],
  controllers: [SoilsController],
})
export class SoilModule {}
