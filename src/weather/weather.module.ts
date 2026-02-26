import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WeatherSnapshot } from './weather-snapshot.entity';
import { User } from '../users/user.entity';
import { WeatherController } from './weather.controller';
import { OpenMeteoClient } from './open-meteo.client';
import { WeatherService } from './weather.service';
import { WeatherRefreshScheduler } from './weather-refresh.scheduler';
import { WeatherEventsHandler } from './weather-events.handler';
import { LocationsModule } from '../locations/locations.module';
import { ActionTasksModule } from '../action-tasks/action-tasks.module';
import { PlantingsModule } from '../plantings/plantings.module';
import { WeatherRecomputeService } from './weather-recompute.service';
import { ActionTask } from '../action-tasks/action-task.entity';
import { Planting } from '../plantings/planting.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([WeatherSnapshot, User, ActionTask, Planting]),
    LocationsModule,
    ActionTasksModule,
    PlantingsModule,
  ],
  controllers: [WeatherController],
  providers: [
    OpenMeteoClient,
    WeatherService,
    WeatherRefreshScheduler,
    WeatherEventsHandler,
    WeatherRecomputeService,
  ],
  exports: [WeatherService, WeatherRecomputeService],
})
export class WeatherModule {}
