const WARSAW_TIMEZONE = 'Europe/Warsaw';

const parsePartsInTimezone = (date: Date, timeZone: string) => {
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

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.get('year') ?? 0),
    month: Number(map.get('month') ?? 1),
    day: Number(map.get('day') ?? 1),
    hour: Number(map.get('hour') ?? 0),
    minute: Number(map.get('minute') ?? 0),
    second: Number(map.get('second') ?? 0),
  };
};

export const normalizeDueAt = (
  date: Date,
  tz = WARSAW_TIMEZONE,
  hour = 9,
  minute = 0,
): Date => {
  const local = parsePartsInTimezone(date, tz);

  const utcCandidate = new Date(
    Date.UTC(local.year, local.month - 1, local.day, hour, minute, 0, 0),
  );

  const candidateLocal = parsePartsInTimezone(utcCandidate, tz);
  const deltaMinutes =
    (hour - candidateLocal.hour) * 60 + (minute - candidateLocal.minute);

  return new Date(utcCandidate.getTime() + deltaMinutes * 60_000);
};

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const toDateOnlyInTimezone = (
  date: Date,
  tz = WARSAW_TIMEZONE,
): Date => {
  const local = parsePartsInTimezone(date, tz);
  return new Date(Date.UTC(local.year, local.month - 1, local.day, 0, 0, 0));
};
