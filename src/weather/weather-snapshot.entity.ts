import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';

export enum WeatherProvider {
  OPEN_METEO = 'OPEN_METEO',
}

export type WeatherDailyPoint = {
  date: string;
  tempMin: number;
  tempMax: number;
  precipSum: number;
  windMax: number;
  weatherCode: number;
};

export type WeatherHourlyPoint = {
  time: string;
  temp: number;
  precip: number;
  rain: number;
  snow: number;
  wind: number;
  weatherCode: number;
  isDay: boolean;
};

export type WeatherCurrentPoint = {
  time: string;
  temp: number;
  precip: number;
  rain: number;
  snow: number;
  wind: number;
  weatherCode: number;
  isDay: boolean;
};

export type WeatherSnapshotData = {
  timezone: string;
  current: WeatherCurrentPoint;
  daily: WeatherDailyPoint[];
  hourly: WeatherHourlyPoint[];
};

@Entity({ tableName: 'weather_snapshots' })
@Index({ properties: ['user'] })
@Index({ properties: ['expiresAt'] })
export class WeatherSnapshot {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({ type: 'double' })
  locationLat!: number;

  @Property({ type: 'double' })
  locationLon!: number;

  @Enum({ items: () => WeatherProvider, default: WeatherProvider.OPEN_METEO })
  provider: WeatherProvider = WeatherProvider.OPEN_METEO;

  @Property({ type: Date })
  fetchedAt!: Date;

  @Property({ type: Date })
  expiresAt!: Date;

  @Property({ type: 'boolean', default: false })
  isStale: boolean = false;

  @Property({ type: 'json', columnType: 'jsonb' })
  data!: WeatherSnapshotData;

  @Property({ type: 'int', default: 1 })
  dataVersion: number = 1;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
