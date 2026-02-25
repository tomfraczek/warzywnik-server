import { LocationRecordMode } from '../../common/enums/location.enums';

export type UserLocationResponseDto = {
  id: string;
  mode: LocationRecordMode;
  label: string;
  lat: number;
  lon: number;
  accuracyM: number | null;
  providerPlaceId: string | null;
  updatedAt: Date;
};
