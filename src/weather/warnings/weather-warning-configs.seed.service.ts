import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultWeatherWarningConfigs } from './default-weather-warning-config.seed';

@Injectable()
export class WeatherWarningConfigsSeedService implements OnModuleInit {
  private readonly logger = new Logger(WeatherWarningConfigsSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultWeatherWarningConfigs(this.em);
    this.logger.log('Default weather warning configs upserted');
  }
}
