import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SoilsController } from './soils.controller';
import { SoilsService } from './soils.service';
import { Soil } from './soil.entity';
import { SoilsSeedService } from './soils.seed.service';

@Module({
  imports: [MikroOrmModule.forFeature([Soil])],
  controllers: [SoilsController],
  providers: [SoilsService, SoilsSeedService],
})
export class SoilsModule {}
