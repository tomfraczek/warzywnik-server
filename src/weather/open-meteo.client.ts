import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpenMeteoForecastResponse } from './weather.types';

@Injectable()
export class OpenMeteoClient {
  private readonly logger = new Logger(OpenMeteoClient.name);
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';
  private readonly timeoutMs = 6000;

  async fetchForecast(params: {
    latitude: number;
    longitude: number;
  }): Promise<OpenMeteoForecastResponse> {
    const searchParams = new URLSearchParams({
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      timezone: 'auto',
      current:
        'temperature_2m,precipitation,rain,snowfall,windspeed_10m,weather_code,is_day',
      daily:
        'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weather_code',
      hourly:
        'temperature_2m,precipitation,rain,snowfall,windspeed_10m,weather_code,is_day',
      forecast_days: '7',
    });

    const url = `${this.baseUrl}?${searchParams.toString()}`;

    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Open-Meteo HTTP ${response.status}`);
        }

        const json = (await response.json()) as unknown;
        return this.ensureValidOpenMeteoResponse(json);
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `Open-Meteo request failed (attempt ${attempt}/2): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ServiceUnavailableException(
      `Weather provider unavailable: ${
        lastError instanceof Error ? lastError.message : 'unknown error'
      }`,
    );
  }

  private ensureValidOpenMeteoResponse(
    payload: unknown,
  ): OpenMeteoForecastResponse {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid weather payload');
    }

    const candidate = payload as Partial<OpenMeteoForecastResponse>;

    if (
      !candidate.current ||
      !candidate.daily ||
      !candidate.hourly ||
      typeof candidate.current.time !== 'string' ||
      typeof candidate.current.temperature_2m !== 'number' ||
      typeof candidate.current.precipitation !== 'number' ||
      typeof candidate.current.rain !== 'number' ||
      typeof candidate.current.snowfall !== 'number' ||
      typeof candidate.current.windspeed_10m !== 'number' ||
      typeof candidate.current.weather_code !== 'number' ||
      typeof candidate.current.is_day !== 'number' ||
      !Array.isArray(candidate.daily.time) ||
      !Array.isArray(candidate.daily.temperature_2m_max) ||
      !Array.isArray(candidate.daily.temperature_2m_min) ||
      !Array.isArray(candidate.daily.precipitation_sum) ||
      !Array.isArray(candidate.daily.windspeed_10m_max) ||
      !Array.isArray(candidate.daily.weather_code) ||
      !Array.isArray(candidate.hourly.time) ||
      !Array.isArray(candidate.hourly.temperature_2m) ||
      !Array.isArray(candidate.hourly.precipitation) ||
      !Array.isArray(candidate.hourly.rain) ||
      !Array.isArray(candidate.hourly.snowfall) ||
      !Array.isArray(candidate.hourly.windspeed_10m) ||
      !Array.isArray(candidate.hourly.weather_code) ||
      !Array.isArray(candidate.hourly.is_day)
    ) {
      throw new Error('Weather payload missing required fields');
    }

    return {
      timezone: candidate.timezone ?? 'UTC',
      current: {
        time: candidate.current.time,
        temperature_2m: candidate.current.temperature_2m,
        precipitation: candidate.current.precipitation,
        rain: candidate.current.rain,
        snowfall: candidate.current.snowfall,
        windspeed_10m: candidate.current.windspeed_10m,
        weather_code: candidate.current.weather_code,
        is_day: candidate.current.is_day,
      },
      daily: {
        time: candidate.daily.time,
        temperature_2m_max: candidate.daily.temperature_2m_max,
        temperature_2m_min: candidate.daily.temperature_2m_min,
        precipitation_sum: candidate.daily.precipitation_sum,
        windspeed_10m_max: candidate.daily.windspeed_10m_max,
        weather_code: candidate.daily.weather_code,
      },
      hourly: {
        time: candidate.hourly.time,
        temperature_2m: candidate.hourly.temperature_2m,
        precipitation: candidate.hourly.precipitation,
        rain: candidate.hourly.rain,
        snowfall: candidate.hourly.snowfall,
        windspeed_10m: candidate.hourly.windspeed_10m,
        weather_code: candidate.hourly.weather_code,
        is_day: candidate.hourly.is_day,
      },
    };
  }
}
