import { Bed } from '../../beds/bed.entity';
import { WarningCode, WarningScope } from '../../common/enums/warning.enums';
import { Planting } from '../../plantings/planting.entity';
import { User } from '../../users/user.entity';
import { WeatherSnapshotData } from '../weather-snapshot.entity';
import { WeatherBasis } from '../weather.types';

export type WeatherWarningContext = {
  user: User;
  beds: Bed[];
  plantings: Planting[];
  now: Date;
  weatherBasis: WeatherBasis;
  snapshotFetchedAt?: Date | null;
  snapshotData?: WeatherSnapshotData | null;
};

export type WarningInstanceUpsertInput = {
  scope: WarningScope;
  code: WarningCode;
  bedId?: string | null;
  plantingId?: string | null;
  values: Record<string, string | number>;
  details?: Record<string, unknown> | null;
  validFrom: Date;
  validTo: Date;
  snapshotFetchedAt?: Date | null;
  weatherBasis: WeatherBasis;
  dedupeKey: string;
};

export interface WeatherWarningEvaluator {
  evaluate(ctx: WeatherWarningContext): Promise<WarningInstanceUpsertInput[]>;
}

export const toEndOfDay = (isoDate: string): Date => {
  const date = new Date(`${isoDate}T23:59:59.999Z`);
  if (Number.isNaN(date.getTime())) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  return date;
};

export const addHours = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
};

export const dedupeKeyFor = (params: {
  userId: string;
  code: WarningCode;
  bedId?: string | null;
  plantingId?: string | null;
}): string => {
  if (params.bedId) {
    return `user:${params.userId}:bed:${params.bedId}:code:${params.code}`;
  }

  if (params.plantingId) {
    return `user:${params.userId}:planting:${params.plantingId}:code:${params.code}`;
  }

  return `user:${params.userId}:code:${params.code}`;
};
