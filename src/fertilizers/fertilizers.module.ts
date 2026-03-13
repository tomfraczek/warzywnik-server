import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { FertilizerType } from './fertilizer-type.entity';
import { FertilizersService } from './fertilizers.service';
import { FertilizersController } from './fertilizers.controller';
import { FertilizersSeedService } from './fertilizers.seed.service';

@Module({
  imports: [MikroOrmModule.forFeature([FertilizerType])],
  providers: [FertilizersService, FertilizersSeedService],
  controllers: [FertilizersController],
})
export class FertilizersModule {}
