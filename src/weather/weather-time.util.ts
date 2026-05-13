const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getDateTimeFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = dateTimeFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  dateTimeFormatterCache.set(timeZone, formatter);
  return formatter;
};

export type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export const getZonedDateTimeParts = (
  date: Date,
  timeZone: string,
): ZonedDateTimeParts => {
  const formatter = getDateTimeFormatter(timeZone);
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

export const zonedTimeToUtc = (
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
    const local = getZonedDateTimeParts(new Date(utcTs), timeZone);
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

export const parseWeatherTime = (
  value: string | null | undefined,
  timeZone: string,
): Date | null => {
  if (!value) {
    return null;
  }

  const plainLocalMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
  );

  if (plainLocalMatch) {
    const [, year, month, day, hour, minute, second = '00', ms = '0'] =
      plainLocalMatch;
    return zonedTimeToUtc(
      timeZone,
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(ms.padEnd(3, '0')),
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const getTimeZoneOffsetMinutes = (
  date: Date,
  timeZone: string,
): number => {
  const parts = getZonedDateTimeParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );

  return Math.round((localAsUtc - date.getTime()) / 60_000);
};

export const formatLocalHour = (date: Date, timeZone: string): string => {
  const parts = getZonedDateTimeParts(date, timeZone);
  return `${parts.hour.toString().padStart(2, '0')}:${parts.minute
    .toString()
    .padStart(2, '0')}`;
};

export const formatLocalIso = (date: Date, timeZone: string): string => {
  const parts = getZonedDateTimeParts(date, timeZone);
  const offsetMinutes = getTimeZoneOffsetMinutes(date, timeZone);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absOffsetMinutes / 60)
    .toString()
    .padStart(2, '0');
  const offsetRemainderMinutes = (absOffsetMinutes % 60)
    .toString()
    .padStart(2, '0');

  return `${parts.year.toString().padStart(4, '0')}-${parts.month
    .toString()
    .padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}T${parts.hour
    .toString()
    .padStart(2, '0')}:${parts.minute
    .toString()
    .padStart(2, '0')}:${parts.second
    .toString()
    .padStart(2, '0')}${sign}${offsetHours}:${offsetRemainderMinutes}`;
};
