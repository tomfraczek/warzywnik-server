import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmOptions from './common/config/mikro-orm.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VegetablesModule } from './vegetables/vegetables.module';
import { PestsModule } from './pests/pests.module';
import { DiseasesModule } from './diseases/diseases.module';
import { SoilsModule } from './soils/soils.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { ClerkAuthGuard } from './auth/clerk-auth.guard';
import { UsersModule } from './users/users.module';
import { FertilizersModule } from './fertilizers/fertilizers.module';
import { WarningRulesModule } from './warning-rules/warning-rules.module';
import { BedsModule } from './beds/beds.module';
import { PlantingsModule } from './plantings/plantings.module';
import { ArticlesModule } from './articles/articles.module';
import { SearchModule } from './search/search.module';
import { PlantingDiseasesModule } from './planting-diseases/planting-diseases.module';
import { RemindersModule } from './reminders/reminders.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MikroOrmModule.forRoot(mikroOrmOptions),
    VegetablesModule,
    PestsModule,
    DiseasesModule,
    SoilsModule,
    UploadsModule,
    AuthModule,
    UsersModule,
    FertilizersModule,
    WarningRulesModule,
    BedsModule,
    PlantingsModule,
    ArticlesModule,
    SearchModule,
    PlantingDiseasesModule,
    RemindersModule,
    DevicesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
