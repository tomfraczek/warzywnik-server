import { z } from 'zod';
import {
  AreaUnit,
  Language,
  LocationMode,
  PrecipitationUnit,
  TemperatureUnit,
  ThemeMode,
} from '../../common/enums/user.enums';

export type PatchMeDto = {
  displayName?: string | null;
  avatarId?: string | null;
  automaticTasksEnabled?: boolean;
  displayTutorials?: boolean;
  themeMode?: ThemeMode;
  language?: Language;
  temperatureUnit?: TemperatureUnit;
  precipitationUnit?: PrecipitationUnit;
  areaUnit?: AreaUnit;
  locationMode?: LocationMode;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLon?: number | null;
};

export type ExportQueryDto = {
  format: 'json' | 'csv';
};

const avatarEnum = z.enum(['bear', 'fox', 'frog', 'hadgehog', 'owl', 'rabit']);

export const patchMeSchema = z
  .object({
    displayName: z.string().min(1).max(50).nullable().optional(),
    avatarId: avatarEnum.nullable().optional(),
    automaticTasksEnabled: z.coerce.boolean().optional(),
    displayTutorials: z.coerce.boolean().optional(),
    themeMode: z.nativeEnum(ThemeMode).optional(),
    language: z.nativeEnum(Language).optional(),
    temperatureUnit: z.nativeEnum(TemperatureUnit).optional(),
    precipitationUnit: z.nativeEnum(PrecipitationUnit).optional(),
    areaUnit: z.nativeEnum(AreaUnit).optional(),
    locationMode: z.nativeEnum(LocationMode).optional(),
    locationLabel: z.string().min(1).max(200).nullable().optional(),
    locationLat: z.coerce.number().min(-90).max(90).nullable().optional(),
    locationLon: z.coerce.number().min(-180).max(180).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const hasLat = data.locationLat !== undefined;
      const hasLon = data.locationLon !== undefined;

      if (hasLat !== hasLon) {
        return false;
      }

      return true;
    },
    { message: 'locationLat and locationLon must be provided together' },
  );

export const exportQuerySchema = z
  .object({
    format: z.enum(['json', 'csv']).default('json'),
  })
  .strict();
