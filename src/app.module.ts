import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmOptions from './common/config/mikro-orm.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { VegetablesModule } from './vegetables/vegetables.module';
import { VegetableTranslationModule } from './vegetables/translations/vegetable-translation.module';
import { SoilModule } from './soil/soil.module';
import { SoilTranslationModule } from './soil/translations/soil-translation.module';
import { ImageModule } from './image/image.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmOptions),
    UserModule,
    SoilModule,
    VegetablesModule,
    SoilTranslationModule,
    VegetableTranslationModule,
    ImageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
