import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UploadsController } from './uploads.controller';
import { MediaLibraryController } from './media-library.controller';
import { R2StorageService } from './r2-storage.service';
import { Vegetable } from '../vegetables/vegetable.entity';
import { VegetablesModule } from '../vegetables/vegetables.module';
import { Article } from '../articles/article.entity';
import { ArticlesModule } from '../articles/articles.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Vegetable, Article]),
    VegetablesModule,
    ArticlesModule,
  ],
  controllers: [UploadsController, MediaLibraryController],
  providers: [R2StorageService],
})
export class UploadsModule {}
