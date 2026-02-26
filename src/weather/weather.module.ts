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
import { WarningRulesModule } from '../warning-rules/warning-rules.module';
import { WarningInstance } from './warnings/warning-instance.entity';
import { WeatherWarningConfig } from './warnings/weather-warning-config.entity';
import { WeatherWarningConfigService } from './warnings/weather-warning-config.service';
import { FrostRiskNext7DaysEvaluator } from './warnings/evaluators/frost-risk-next-7-days.evaluator';
import { HardFrostRiskNext7DaysEvaluator } from './warnings/evaluators/hard-frost-risk-next-7-days.evaluator';
import { DroughtRiskNext7DaysEvaluator } from './warnings/evaluators/drought-risk-next-7-days.evaluator';
import { HeavyRainRiskNext48hEvaluator } from './warnings/evaluators/heavy-rain-risk-next-48h.evaluator';
import { WindDamageRiskNext48hEvaluator } from './warnings/evaluators/wind-damage-risk-next-48h.evaluator';
import { FungalDiseasePressureHighEvaluator } from './warnings/evaluators/fungal-disease-pressure-high.evaluator';
import { OverwateringRiskEvaluator } from './warnings/evaluators/overwatering-risk.evaluator';
import { GerminationTooColdEvaluator } from './warnings/evaluators/germination-too-cold.evaluator';
import { WeatherWarningOrchestratorService } from './warnings/weather-warning-orchestrator.service';
import { WeatherTaskPlannerService } from './warnings/weather-task-planner.service';
import { WeatherWarningsSeedService } from './warnings/weather-warnings.seed.service';
import { Bed } from '../beds/bed.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      WeatherSnapshot,
      User,
      ActionTask,
      Planting,
      Bed,
      WarningInstance,
      WeatherWarningConfig,
    ]),
    LocationsModule,
    ActionTasksModule,
    PlantingsModule,
    WarningRulesModule,
  ],
  controllers: [WeatherController],
  providers: [
    OpenMeteoClient,
    WeatherService,
    WeatherRefreshScheduler,
    WeatherEventsHandler,
    WeatherRecomputeService,
    WeatherWarningConfigService,
    FrostRiskNext7DaysEvaluator,
    HardFrostRiskNext7DaysEvaluator,
    DroughtRiskNext7DaysEvaluator,
    HeavyRainRiskNext48hEvaluator,
    WindDamageRiskNext48hEvaluator,
    FungalDiseasePressureHighEvaluator,
    OverwateringRiskEvaluator,
    GerminationTooColdEvaluator,
    WeatherWarningOrchestratorService,
    WeatherTaskPlannerService,
    WeatherWarningsSeedService,
  ],
  exports: [WeatherService, WeatherRecomputeService],
})
export class WeatherModule {}
