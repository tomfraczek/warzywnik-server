import { Injectable } from '@nestjs/common';

export type NearTermWeatherStatusConfig = {
  rainMinMm: number;
  heavyRainHourlyMm: number;
  strongWindKmh: number;
  nearTermHours: number;
  soonHours: number;
};

@Injectable()
export class WeatherStatusConfigService {
  private readonly nearTermConfig: NearTermWeatherStatusConfig = {
    rainMinMm: 0.2,
    heavyRainHourlyMm: 3,
    strongWindKmh: 45,
    nearTermHours: 12,
    soonHours: 3,
  };

  getNearTermConfig(): NearTermWeatherStatusConfig {
    return this.nearTermConfig;
  }
}
