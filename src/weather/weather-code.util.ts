import { type WeatherType } from './weather.types';
import { type WeatherHourlyPoint } from './weather-snapshot.entity';

export function toWeatherType(code: number): WeatherType {
  if (code === 0) return 'CLEAR';
  if (code === 1 || code === 2) return 'PARTLY_CLOUDY';
  if (code === 3) return 'CLOUDY';
  if (code === 45 || code === 48) return 'FOG';
  if (code >= 51 && code <= 57) return 'DRIZZLE';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'RAIN';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'SNOW';
  if (code === 95) return 'THUNDERSTORM';
  if (code === 96 || code === 99) return 'HAIL';
  return 'UNKNOWN';
}

export function toWeatherLabel(code: number, isDay?: boolean): string {
  switch (code) {
    case 0:
      return isDay === false ? 'Bezchmurnie' : 'Słonecznie';
    case 1:
      return isDay === false ? 'Prawie bezchmurnie' : 'Przeważnie słonecznie';
    case 2:
      return 'Częściowe zachmurzenie';
    case 3:
      return 'Pochmurnie';
    case 45:
    case 48:
      return 'Mgła';
    case 51:
    case 53:
    case 55:
      return 'Mżawka';
    case 56:
    case 57:
      return 'Marznąca mżawka';
    case 61:
    case 63:
    case 65:
      return 'Deszcz';
    case 66:
    case 67:
      return 'Marznący deszcz';
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return 'Śnieg';
    case 80:
    case 81:
    case 82:
      return 'Przelotny deszcz';
    case 95:
      return 'Burza';
    case 96:
    case 99:
      return 'Burza z gradem';
    default:
      return 'Nieznane warunki';
  }
}

export function isThunderstormCode(code: number): boolean {
  return code === 95 || code === 96 || code === 99;
}

export function isRainCode(code: number): boolean {
  return (code >= 61 && code <= 67) || (code >= 80 && code <= 82);
}

export function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

export function isHeavyRainCode(code: number): boolean {
  return code === 65 || code === 67 || code === 82;
}

export function isHeavyRainHour(
  hour: Pick<WeatherHourlyPoint, 'precip' | 'rain' | 'weatherCode'>,
  heavyRainHourlyMm: number,
): boolean {
  return (
    hour.precip >= heavyRainHourlyMm ||
    hour.rain >= heavyRainHourlyMm ||
    isHeavyRainCode(hour.weatherCode)
  );
}
