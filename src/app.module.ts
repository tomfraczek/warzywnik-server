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
import { PestOccurrencesModule } from './pest-occurrences/pest-occurrences.module';
import { ActionTemplatesModule } from './action-templates/action-templates.module';
import { ActionTasksModule } from './action-tasks/action-tasks.module';
import { HarvestPromptsModule } from './harvest-prompts/harvest-prompts.module';
import { CalendarModule } from './calendar/calendar.module';
import { GeoModule } from './geo/geo.module';
import { LocationsModule } from './locations/locations.module';
import { WeatherModule } from './weather/weather.module';
import { PlantingInsightsModule } from './planting-insights/planting-insights.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FavoritesModule } from './favorites/favorites.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlanChecklistsModule } from './plan-checklists/plan-checklists.module';
import { VegetableSuggestionsModule } from './vegetable-suggestions/vegetable-suggestions.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MikroOrmModule.forRoot(mikroOrmOptions),
    SoilsModule,
    PestsModule,
    DiseasesModule,
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
    PestOccurrencesModule,
    ActionTemplatesModule,
    VegetablesModule,
    ActionTasksModule,
    HarvestPromptsModule,
    CalendarModule,
    GeoModule,
    LocationsModule,
    WeatherModule,
    PlantingInsightsModule,
    AnalyticsModule,
    FavoritesModule,
    NotificationsModule,
    PlanChecklistsModule,
    VegetableSuggestionsModule,
    NotesModule,
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
