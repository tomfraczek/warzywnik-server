import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DiseasesController } from './diseases.controller';
import { DiseasesService } from './diseases.service';
import { Disease } from './disease.entity';
import { DiseasesSeedService } from './diseases.seed.service';

@Module({
  imports: [MikroOrmModule.forFeature([Disease])],
  controllers: [DiseasesController],
  providers: [DiseasesService, DiseasesSeedService],
})
export class DiseasesModule {}
