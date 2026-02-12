import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Vegetable } from '../vegetables/vegetable.entity';
import { Article } from '../articles/article.entity';
import { FertilizerType } from '../fertilizers/fertilizer-type.entity';
import { Disease } from '../diseases/disease.entity';
import { Pest } from '../pests/pest.entity';
import { Soil } from '../soils/soil.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Vegetable,
      Article,
      FertilizerType,
      Disease,
      Pest,
      Soil,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
