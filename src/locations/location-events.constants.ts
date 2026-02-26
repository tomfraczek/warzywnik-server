import { LocationRecordMode } from '../common/enums/location.enums';

export const LOCATION_UPDATED_EVENT = 'LOCATION_UPDATED';
export const WEATHER_SNAPSHOT_UPDATED_EVENT = 'WEATHER_SNAPSHOT_UPDATED';

export type LocationUpdatedPayload = {
  userId: string;
  locationId: string;
  mode: LocationRecordMode;
  lat: number;
  lon: number;
  updatedAt: string;
};

export type WeatherSnapshotUpdatedPayload = {
  userId: string;
  fetchedAt: string;
  expiresAt: string;
  stale: boolean;
};
