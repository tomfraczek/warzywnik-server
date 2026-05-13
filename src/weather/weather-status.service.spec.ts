import {
  WarningCode,
  WarningScope,
  WarningSeverity,
} from '../common/enums/warning.enums';
import { type WeatherSnapshotData } from './weather-snapshot.entity';
import { WeatherStatusConfigService } from './weather-status-config.service';
import { WeatherStatusService } from './weather-status.service';
import { type WarningDto } from './dto/warnings-response.dto';

const createService = (): WeatherStatusService =>
  new WeatherStatusService(new WeatherStatusConfigService());

type NearTermStatus = ReturnType<
  WeatherStatusService['buildNearTermWeatherStatus']
>;
type GardenRiskStatus = ReturnType<
  WeatherStatusService['buildGardenRiskStatus']
>;

const baseSnapshot = (): WeatherSnapshotData => ({
  timezone: 'Europe/Warsaw',
  current: {
    time: '2026-05-13T12:00',
    temp: 18,
    precip: 0,
    rain: 0,
    snow: 0,
    wind: 12,
    weatherCode: 3,
    isDay: true,
  },
  daily: [
    {
      date: '2026-05-13',
      tempMin: 12,
      tempMax: 22,
      precipSum: 0,
      windMax: 24,
      weatherCode: 3,
    },
  ],
  hourly: Array.from({ length: 12 }, (_, index) => ({
    time: `2026-05-13T${String(12 + index).padStart(2, '0')}:00`,
    temp: 18,
    precip: 0,
    rain: 0,
    snow: 0,
    wind: 12,
    weatherCode: 3,
    isDay: index < 8,
  })),
});

describe('WeatherStatusService', () => {
  const now = new Date('2026-05-13T10:00:00.000Z');

  it('prefers later thunderstorm over earlier rain so status is not calm', () => {
    const service = createService();
    const snapshot = baseSnapshot();

    snapshot.hourly[2] = {
      ...snapshot.hourly[2],
      time: '2026-05-13T14:00',
      precip: 0.7,
      rain: 0.7,
      weatherCode: 61,
    };
    snapshot.hourly[5] = {
      ...snapshot.hourly[5],
      time: '2026-05-13T17:00',
      precip: 4,
      rain: 4,
      wind: 30,
      weatherCode: 95,
    };
    snapshot.hourly[6] = {
      ...snapshot.hourly[6],
      time: '2026-05-13T18:00',
      precip: 3.5,
      rain: 3.5,
      wind: 26,
      weatherCode: 95,
      isDay: false,
    };

    const result: NearTermStatus = service.buildNearTermWeatherStatus(
      snapshot,
      now,
    );

    expect(result.code).toBe('THUNDERSTORM_LATER');
    expect(result.severity).toBe('warning');
    expect(result.source).toBe('hourly_forecast');
  });

  it('returns RAIN_NOW when rain is happening now and no storms follow', () => {
    const service = createService();
    const snapshot = baseSnapshot();

    snapshot.current = {
      ...snapshot.current,
      precip: 0.8,
      rain: 0.8,
      weatherCode: 61,
    };
    snapshot.hourly[0] = {
      ...snapshot.hourly[0],
      precip: 0.8,
      rain: 0.8,
      weatherCode: 61,
    };

    const result: NearTermStatus = service.buildNearTermWeatherStatus(
      snapshot,
      now,
    );

    expect(result.code).toBe('RAIN_NOW');
    expect(result.severity).toBe('info');
  });

  it('returns CALM when no significant changes are detected', () => {
    const service = createService();
    const snapshot = baseSnapshot();

    const result: NearTermStatus = service.buildNearTermWeatherStatus(
      snapshot,
      now,
    );

    expect(result.code).toBe('CALM');
    expect(result.severity).toBe('ok');
  });

  it('prefers THUNDERSTORM_SOON over light rain now', () => {
    const service = createService();
    const snapshot = baseSnapshot();

    snapshot.current = {
      ...snapshot.current,
      precip: 0.4,
      rain: 0.4,
      weatherCode: 61,
    };
    snapshot.hourly[0] = {
      ...snapshot.hourly[0],
      precip: 0.4,
      rain: 0.4,
      weatherCode: 61,
    };
    snapshot.hourly[1] = {
      ...snapshot.hourly[1],
      time: '2026-05-13T13:00',
      precip: 4,
      rain: 4,
      wind: 30,
      weatherCode: 95,
    };

    const result: NearTermStatus = service.buildNearTermWeatherStatus(
      snapshot,
      now,
    );

    expect(result.code).toBe('THUNDERSTORM_SOON');
  });

  it('separates later thunderstorm from empty garden warnings', () => {
    const service = createService();
    const snapshot = baseSnapshot();

    snapshot.hourly[5] = {
      ...snapshot.hourly[5],
      time: '2026-05-13T17:00',
      precip: 4,
      rain: 4,
      weatherCode: 95,
    };

    const status: NearTermStatus = service.buildNearTermWeatherStatus(
      snapshot,
      now,
    );
    const gardenRiskStatus: GardenRiskStatus = service.buildGardenRiskStatus(
      [],
    );

    expect(status.code).toBe('THUNDERSTORM_LATER');
    expect(gardenRiskStatus.code).toBe('OK');
    expect(gardenRiskStatus.source).toBe('warnings');
  });

  it('keeps frost in garden risk while near-term weather shows rain', () => {
    const service = createService();
    const snapshot = baseSnapshot();

    snapshot.hourly[1] = {
      ...snapshot.hourly[1],
      time: '2026-05-13T13:00',
      precip: 0.8,
      rain: 0.8,
      weatherCode: 61,
    };

    const status: NearTermStatus = service.buildNearTermWeatherStatus(
      snapshot,
      now,
    );
    const gardenRiskStatus: GardenRiskStatus = service.buildGardenRiskStatus([
      {
        dedupeKey: 'frost-1',
        code: WarningCode.FROST_RISK_TODAY_NIGHT,
        severity: WarningSeverity.WARNING,
        title: 'Ryzyko przymrozku',
        message: 'W nocy możliwy spadek temperatury poniżej 0°C.',
        scope: WarningScope.USER,
        validTo: '2026-05-14T04:00:00.000Z',
      },
    ] as WarningDto[]);

    expect(['RAIN_NOW', 'RAIN_SOON']).toContain(status.code);
    expect(gardenRiskStatus.code).toBe('FROST');
    expect(gardenRiskStatus.severity).toBe('warning');
  });

  it('exposes candidate scoring in debug helper', () => {
    const service = createService();
    const snapshot = baseSnapshot();

    snapshot.hourly[1] = {
      ...snapshot.hourly[1],
      time: '2026-05-13T13:00',
      precip: 4,
      rain: 4,
      weatherCode: 95,
    };

    const result = service.buildNearTermWeatherStatusWithDebug(snapshot, now);

    expect(result.debug.candidates.length).toBeGreaterThan(0);
    expect(result.debug.selectedCode).toBe('THUNDERSTORM_SOON');
  });
});
