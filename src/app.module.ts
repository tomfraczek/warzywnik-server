import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmOptions from './common/config/mikro-orm.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VegetablesModule } from './vegetables/vegetables.module';
import { PestsModule } from './pests/pests.module';
import { DiseasesModule } from './diseases/diseases.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmOptions),
    VegetablesModule,
    PestsModule,
    DiseasesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
