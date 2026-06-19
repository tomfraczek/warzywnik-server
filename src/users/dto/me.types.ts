import {
  AreaUnit,
  Language,
  LocationMode,
  PrecipitationUnit,
  TemperatureUnit,
  ThemeMode,
} from '../../common/enums/user.enums';

export type MeResponse = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarId: string | null;
  themeMode: ThemeMode;
  language: Language;
  temperatureUnit: TemperatureUnit;
  precipitationUnit: PrecipitationUnit;
  areaUnit: AreaUnit;
  locationMode: LocationMode;
  locationLabel: string | null;
  locationLat: number | null;
  locationLon: number | null;
  locationUpdatedAt: Date | null;
  automaticTasksEnabled: boolean;
  displayTutorials: boolean;
};
