import {
  type WeatherCurrentPoint,
  WeatherSnapshot,
  type WeatherDailyPoint,
  type WeatherHourlyPoint,
  type WeatherSnapshotData,
} from './weather-snapshot.entity';
import { OpenMeteoForecastResponse } from './weather.types';
import {
  WeatherCurrentDto,
  WeatherDailyDto,
  WeatherHourlyDto,
  WeatherResponseDto,
  WeatherTodayDto,
  WeatherUnitsDto,
} from './dto/weather-response.dto';
import { toWeatherLabel, toWeatherType } from './weather-code.util';

type LegacyWeatherDailyPoint = Omit<WeatherDailyPoint, 'weatherCode'> & {
  weatherCode?: number;
  weather_code?: number | string;
};

type LegacyWeatherHourlyPoint = Omit<
  WeatherHourlyPoint,
  'rain' | 'snow' | 'weatherCode' | 'isDay'
> & {
  rain?: number;
  snow?: number;
  weatherCode?: number;
  weather_code?: number | string;
  isDay?: boolean;
  is_day?: boolean | number | string;
};

type LegacyWeatherCurrentPoint = Partial<WeatherCurrentPoint> & {
  weather_code?: number | string;
  is_day?: boolean | number | string;
};

type LegacyWeatherSnapshotData = {
  timezone?: string;
  current?: LegacyWeatherCurrentPoint;
  daily?: LegacyWeatherDailyPoint[];
  hourly?: LegacyWeatherHourlyPoint[];
};

const toFiniteNumber = (value: number | undefined): number =>
  Number.isFinite(value) ? (value as number) : 0;

const normalizeWeatherCode = (value: unknown): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : -1;
};

const normalizeIsDay = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value === '1' || value === 'true';
  return true;
};

export function mapOpenMeteoToSnapshotData(
  payload: OpenMeteoForecastResponse,
): WeatherSnapshotData {
  const current: WeatherCurrentPoint = {
    time: payload.current.time,
    temp: toFiniteNumber(payload.current.temperature_2m),
    precip: toFiniteNumber(payload.current.precipitation),
    rain: toFiniteNumber(payload.current.rain),
    snow: toFiniteNumber(payload.current.snowfall),
    wind: toFiniteNumber(payload.current.windspeed_10m),
    weatherCode: toFiniteNumber(payload.current.weather_code),
    isDay: payload.current.is_day === 1,
  };

  const daily: WeatherDailyPoint[] = payload.daily.time.map((date, index) => ({
    date,
    tempMin: toFiniteNumber(payload.daily.temperature_2m_min[index]),
    tempMax: toFiniteNumber(payload.daily.temperature_2m_max[index]),
    precipSum: toFiniteNumber(payload.daily.precipitation_sum[index]),
    windMax: toFiniteNumber(payload.daily.windspeed_10m_max[index]),
    weatherCode: toFiniteNumber(payload.daily.weather_code[index]),
  }));

  const hourly: WeatherHourlyPoint[] = payload.hourly.time.map(
    (time, index) => ({
      time,
      temp: toFiniteNumber(payload.hourly.temperature_2m[index]),
      precip: toFiniteNumber(payload.hourly.precipitation[index]),
      rain: toFiniteNumber(payload.hourly.rain[index]),
      snow: toFiniteNumber(payload.hourly.snowfall[index]),
      wind: toFiniteNumber(payload.hourly.windspeed_10m[index]),
      weatherCode: toFiniteNumber(payload.hourly.weather_code[index]),
      isDay: toFiniteNumber(payload.hourly.is_day[index]) === 1,
    }),
  );

  return {
    timezone: payload.timezone,
    current,
    daily,
    hourly,
  };
}

export function mapSnapshotToWeatherResponse(params: {
  snapshot: WeatherSnapshot;
  stale: boolean;
  location: { label: string; lat: number; lon: number };
  message?: string;
}): WeatherResponseDto {
  const snapshotData = params.snapshot.data as LegacyWeatherSnapshotData;
  const dailyPoints = snapshotData.daily ?? [];
  const hourlyPoints = snapshotData.hourly ?? [];

  const todayPoint = dailyPoints[0];
  const todayDate = todayPoint?.date ?? '';
  const firstHourlyPoint = hourlyPoints[0];

  const fallbackCurrent: WeatherCurrentPoint = {
    time: firstHourlyPoint?.time ?? params.snapshot.fetchedAt.toISOString(),
    temp: firstHourlyPoint?.temp ?? todayPoint?.tempMin ?? 0,
    precip: firstHourlyPoint?.precip ?? 0,
    rain: firstHourlyPoint?.rain ?? 0,
    snow: firstHourlyPoint?.snow ?? 0,
    wind: firstHourlyPoint?.wind ?? todayPoint?.windMax ?? 0,
    weatherCode: firstHourlyPoint?.weatherCode ?? todayPoint?.weatherCode ?? -1,
    isDay: firstHourlyPoint?.isDay ?? true,
  };

  const currentPoint: WeatherCurrentPoint = {
    ...fallbackCurrent,
    ...snapshotData.current,
    time: snapshotData.current?.time ?? fallbackCurrent.time,
    temp: snapshotData.current?.temp ?? fallbackCurrent.temp,
    precip: snapshotData.current?.precip ?? fallbackCurrent.precip,
    rain: snapshotData.current?.rain ?? fallbackCurrent.rain,
    snow: snapshotData.current?.snow ?? fallbackCurrent.snow,
    wind: snapshotData.current?.wind ?? fallbackCurrent.wind,
    weatherCode: normalizeWeatherCode(
      snapshotData.current?.weatherCode ??
        snapshotData.current?.weather_code ??
        fallbackCurrent.weatherCode,
    ),
    isDay: normalizeIsDay(
      snapshotData.current?.isDay ??
        snapshotData.current?.is_day ??
        fallbackCurrent.isDay,
    ),
  };

  const units: WeatherUnitsDto = {
    temperature: '°C',
    wind: 'km/h',
    precipitation: 'mm',
  };

  const current: WeatherCurrentDto = {
    time: currentPoint.time,
    temp: currentPoint.temp,
    precip: currentPoint.precip,
    rain: currentPoint.rain,
    snow: currentPoint.snow,
    windSpeed: currentPoint.wind,
    isDay: currentPoint.isDay,
    weatherType: toWeatherType(currentPoint.weatherCode),
    type: toWeatherType(currentPoint.weatherCode),
    weatherLabel: toWeatherLabel(currentPoint.weatherCode, currentPoint.isDay),
    label: toWeatherLabel(currentPoint.weatherCode, currentPoint.isDay),
  };

  const today: WeatherTodayDto = {
    date: todayPoint?.date ?? '',
    tempMin: todayPoint?.tempMin ?? 0,
    tempMax: todayPoint?.tempMax ?? 0,
    precipSum: todayPoint?.precipSum ?? 0,
    windMax: todayPoint?.windMax ?? 0,
    weatherType: toWeatherType(
      normalizeWeatherCode(todayPoint?.weatherCode ?? todayPoint?.weather_code),
    ),
    type: toWeatherType(
      normalizeWeatherCode(todayPoint?.weatherCode ?? todayPoint?.weather_code),
    ),
    weatherLabel: toWeatherLabel(
      normalizeWeatherCode(todayPoint?.weatherCode ?? todayPoint?.weather_code),
    ),
    label: toWeatherLabel(
      normalizeWeatherCode(todayPoint?.weatherCode ?? todayPoint?.weather_code),
    ),
  };

  const hourlyToday: WeatherHourlyDto[] = hourlyPoints
    .filter((item) => item.time.startsWith(todayDate))
    .map((item) => ({
      time: item.time,
      temp: item.temp,
      precip: item.precip,
      rain: item.rain ?? 0,
      snow: item.snow ?? 0,
      windSpeed: item.wind,
      isDay: normalizeIsDay(item.isDay ?? item.is_day),
      weatherType: toWeatherType(
        normalizeWeatherCode(item.weatherCode ?? item.weather_code),
      ),
      type: toWeatherType(
        normalizeWeatherCode(item.weatherCode ?? item.weather_code),
      ),
      weatherLabel: toWeatherLabel(
        normalizeWeatherCode(item.weatherCode ?? item.weather_code),
        normalizeIsDay(item.isDay ?? item.is_day),
      ),
      label: toWeatherLabel(
        normalizeWeatherCode(item.weatherCode ?? item.weather_code),
        normalizeIsDay(item.isDay ?? item.is_day),
      ),
    }));

  const nextDays: WeatherDailyDto[] = dailyPoints.slice(1).map((item) => ({
    date: item.date,
    tempMin: item.tempMin,
    tempMax: item.tempMax,
    precipSum: item.precipSum,
    windMax: item.windMax,
    weatherType: toWeatherType(
      normalizeWeatherCode(item.weatherCode ?? item.weather_code),
    ),
    type: toWeatherType(
      normalizeWeatherCode(item.weatherCode ?? item.weather_code),
    ),
    weatherLabel: toWeatherLabel(
      normalizeWeatherCode(item.weatherCode ?? item.weather_code),
    ),
    label: toWeatherLabel(
      normalizeWeatherCode(item.weatherCode ?? item.weather_code),
    ),
  }));

  return {
    fetchedAt: params.snapshot.fetchedAt.toISOString(),
    expiresAt: params.snapshot.expiresAt.toISOString(),
    stale: params.stale,
    message: params.message,
    location: {
      label: params.location.label,
      lat: params.location.lat,
      lon: params.location.lon,
    },
    units,
    current,
    today,
    hourlyToday,
    nextDays,
  };
}
