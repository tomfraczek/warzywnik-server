import { mapOpenMeteoToSnapshotData } from './weather.mapper';
import { OpenMeteoForecastResponse } from './weather.types';

describe('weather mapper', () => {
  it('maps Open-Meteo payload to snapshot data', () => {
    const payload: OpenMeteoForecastResponse = {
      timezone: 'Europe/Warsaw',
      current: {
        time: '2026-02-25T10:15',
        temperature_2m: 6.4,
        precipitation: 0.1,
        rain: 0.1,
        snowfall: 0,
        windspeed_10m: 11.2,
        weather_code: 61,
        is_day: 1,
      },
      daily: {
        time: ['2026-02-25'],
        temperature_2m_max: [8.5],
        temperature_2m_min: [1.1],
        precipitation_sum: [3.2],
        windspeed_10m_max: [18.4],
        weather_code: [61],
      },
      hourly: {
        time: ['2026-02-25T10:00'],
        temperature_2m: [6.4],
        precipitation: [0.1],
        rain: [0.1],
        snowfall: [0],
        windspeed_10m: [11.2],
        weather_code: [61],
        is_day: [1],
      },
    };

    const result = mapOpenMeteoToSnapshotData(payload);

    expect(result.timezone).toBe('Europe/Warsaw');
    expect(result.current).toEqual({
      time: '2026-02-25T10:15',
      temp: 6.4,
      precip: 0.1,
      rain: 0.1,
      snow: 0,
      wind: 11.2,
      weatherCode: 61,
      isDay: true,
    });
    expect(result.daily).toEqual([
      {
        date: '2026-02-25',
        tempMin: 1.1,
        tempMax: 8.5,
        precipSum: 3.2,
        windMax: 18.4,
        weatherCode: 61,
      },
    ]);
    expect(result.hourly).toEqual([
      {
        time: '2026-02-25T10:00',
        temp: 6.4,
        precip: 0.1,
        rain: 0.1,
        snow: 0,
        wind: 11.2,
        weatherCode: 61,
        isDay: true,
      },
    ]);
  });
});
