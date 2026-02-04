import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BedsController } from './beds.controller';
import { BedsService } from './beds.service';
import { Bed } from './bed.entity';
import { Soil } from '../soils/soil.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Bed, Soil])],
  controllers: [BedsController],
  providers: [BedsService],
  exports: [BedsService],
})
export class BedsModule {}
