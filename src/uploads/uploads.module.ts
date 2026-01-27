import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UploadsController } from './uploads.controller';
import { R2StorageService } from './r2-storage.service';
import { Vegetable } from '../vegetables/vegetable.entity';
import { VegetablesModule } from '../vegetables/vegetables.module';

@Module({
  imports: [MikroOrmModule.forFeature([Vegetable]), VegetablesModule],
  controllers: [UploadsController],
  providers: [R2StorageService],
})
export class UploadsModule {}
