import { Bed } from '../../beds/bed.entity';
import { WarningCode, WarningScope } from '../../common/enums/warning.enums';
import { Planting } from '../../plantings/planting.entity';
import { User } from '../../users/user.entity';
import { WeatherSnapshotData } from '../weather-snapshot.entity';
import { WeatherBasis } from '../weather.types';

export type DayPart = 'DAY' | 'NIGHT';

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
  localDate?: string;
  dayPart?: DayPart;
}): string => {
  const suffix = `${params.localDate ? `:date:${params.localDate}` : ''}${
    params.dayPart ? `:part:${params.dayPart}` : ''
  }`;

  if (params.bedId) {
    return `user:${params.userId}:bed:${params.bedId}:code:${params.code}${suffix}`;
  }

  if (params.plantingId) {
    return `user:${params.userId}:planting:${params.plantingId}:code:${params.code}${suffix}`;
  }

  return `user:${params.userId}:code:${params.code}${suffix}`;
};

const localDateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const localDateHourFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getDateFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = localDateFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  localDateFormatterCache.set(timeZone, formatter);
  return formatter;
};

const getDateHourFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = localDateHourFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  localDateHourFormatterCache.set(timeZone, formatter);
  return formatter;
};

const toParts = (
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} => {
  const formatter = getDateHourFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const partByType = new Map(parts.map((item) => [item.type, item.value]));
  return {
    year: Number(partByType.get('year') ?? '1970'),
    month: Number(partByType.get('month') ?? '01'),
    day: Number(partByType.get('day') ?? '01'),
    hour: Number(partByType.get('hour') ?? '00'),
    minute: Number(partByType.get('minute') ?? '00'),
    second: Number(partByType.get('second') ?? '00'),
  };
};

export const getLocalDate = (date: Date, timeZone: string): string => {
  return getDateFormatter(timeZone).format(date);
};

export const localDatePlusDays = (
  localDate: string,
  dayDelta: number,
): string | null => {
  const [yearRaw, monthRaw, dayRaw] = localDate.split('-').map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) return null;

  const utc = new Date(Date.UTC(yearRaw, monthRaw - 1, dayRaw + dayDelta));
  return utc.toISOString().slice(0, 10);
};

export const localDateAndHourFromTime = (
  value: string,
  timeZone: string,
): { localDate: string; hour: number } | null => {
  const plainLocalMatch = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/,
  );
  if (plainLocalMatch) {
    return {
      localDate: plainLocalMatch[1],
      hour: Number(plainLocalMatch[2]),
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = toParts(date, timeZone);
  return {
    localDate: `${parts.year.toString().padStart(4, '0')}-${parts.month
      .toString()
      .padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`,
    hour: parts.hour,
  };
};

const zonedTimeToUtc = (
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
): Date => {
  let utcTs = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const targetTs = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  for (let i = 0; i < 4; i += 1) {
    const local = toParts(new Date(utcTs), timeZone);
    const localTs = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
      0,
    );
    const diff = targetTs - localTs;
    if (diff === 0) {
      break;
    }
    utcTs += diff;
  }

  return new Date(utcTs);
};

export const localDayBoundsUtc = (
  localDate: string,
  timeZone: string,
): { start: Date; end: Date } | null => {
  const [yearRaw, monthRaw, dayRaw] = localDate.split('-').map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) return null;

  return {
    start: zonedTimeToUtc(timeZone, yearRaw, monthRaw, dayRaw, 0, 0, 0, 0),
    end: zonedTimeToUtc(timeZone, yearRaw, monthRaw, dayRaw, 23, 59, 59, 999),
  };
};
