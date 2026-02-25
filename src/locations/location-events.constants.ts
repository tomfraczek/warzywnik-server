import { LocationRecordMode } from '../common/enums/location.enums';

export const LOCATION_UPDATED_EVENT = 'LOCATION_UPDATED';

export type LocationUpdatedPayload = {
  userId: string;
  locationId: string;
  mode: LocationRecordMode;
  lat: number;
  lon: number;
  updatedAt: string;
};
