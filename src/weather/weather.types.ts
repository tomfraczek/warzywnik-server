export type OpenMeteoForecastResponse = {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    precipitation: number;
    rain: number;
    snowfall: number;
    windspeed_10m: number;
    weather_code: number;
    is_day: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
    weather_code: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    rain: number[];
    snowfall: number[];
    windspeed_10m: number[];
    weather_code: number[];
    is_day: number[];
  };
};

export type WeatherType =
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'FOG'
  | 'DRIZZLE'
  | 'RAIN'
  | 'SNOW'
  | 'THUNDERSTORM'
  | 'HAIL'
  | 'UNKNOWN';

export type WeatherBasis = 'FRESH' | 'STALE' | 'NONE';
