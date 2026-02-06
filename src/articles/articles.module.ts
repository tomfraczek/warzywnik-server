import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Article } from './article.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Article])],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
