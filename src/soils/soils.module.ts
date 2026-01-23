import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SoilsController } from './soils.controller';
import { SoilsService } from './soils.service';
import { Soil } from './soil.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Soil])],
  controllers: [SoilsController],
  providers: [SoilsService],
})
export class SoilsModule {}
