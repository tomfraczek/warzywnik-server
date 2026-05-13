import { Injectable } from '@nestjs/common';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';
import { WarningDto } from './dto/warnings-response.dto';
import {
  type WeatherHourlyPoint,
  type WeatherSnapshotData,
} from './weather-snapshot.entity';
import {
  isHeavyRainHour,
  isRainCode,
  isSnowCode,
  isThunderstormCode,
} from './weather-code.util';
import {
  formatLocalHour,
  formatLocalIso,
  getZonedDateTimeParts,
  parseWeatherTime,
} from './weather-time.util';
import {
  type NearTermWeatherStatusConfig,
  WeatherStatusConfigService,
} from './weather-status-config.service';

type NearTermPhenomenon =
  | 'THUNDERSTORM'
  | 'HEAVY_RAIN'
  | 'SNOW'
  | 'STRONG_WIND'
  | 'RAIN';

type TimingBucket = 'NOW' | 'SOON' | 'LATER';

type BuiltWeatherStatusSeverity = 'ok' | 'info' | 'warning' | 'danger';
type BuiltWeatherStatusLevel = 'ok' | 'watch' | 'warning' | 'critical';

type BuiltWeatherStatus = {
  code: string;
  level?: BuiltWeatherStatusLevel;
  severity: BuiltWeatherStatusSeverity;
  title: string;
  subtitle: string;
  startsAt?: string | null;
  endsAt?: string | null;
  validTo?: string | null;
  source: 'hourly_forecast' | 'warnings';
  sources?: string[];
};

type AnalyzedHour = {
  time: string;
  date: Date;
  weatherCode: number;
  precip: number;
  rain: number;
  snow: number;
  windSpeed: number;
  temperature: number;
  isDay: boolean;
  offsetHours: number;
  phenomena: NearTermPhenomenon[];
  isCurrent: boolean;
};

type StatusCandidate = {
  phenomenon: NearTermPhenomenon;
  timing: TimingBucket;
  code: string;
  severity: BuiltWeatherStatusSeverity;
  title: string;
  subtitle: string;
  startsAt: string;
  endsAt: string;
  validTo: string;
  score: number;
  source: 'hourly_forecast';
  matchedHours: string[];
};

export type NearTermWeatherStatusDebug = {
  timezone: string;
  analyzedHours: Array<{
    time: string;
    localTime: string;
    offsetHours: number;
    isCurrent: boolean;
    phenomena: NearTermPhenomenon[];
    precip: number;
    rain: number;
    snow: number;
    windSpeed: number;
    weatherCode: number;
  }>;
  candidates: Array<{
    code: string;
    timing: TimingBucket;
    score: number;
    matchedHours: string[];
  }>;
  selectedCode: string;
};

const PHENOMENON_SCORE: Record<NearTermPhenomenon, number> = {
  THUNDERSTORM: 100,
  HEAVY_RAIN: 80,
  SNOW: 65,
  STRONG_WIND: 55,
  RAIN: 40,
};

const TIMING_SCORE: Record<TimingBucket, number> = {
  NOW: 30,
  SOON: 18,
  LATER: 0,
};

const WARNING_SEVERITY_RANK: Record<WarningSeverity, number> = {
  [WarningSeverity.INFO]: 1,
  [WarningSeverity.WARNING]: 2,
  [WarningSeverity.CRITICAL]: 3,
};

const NON_GARDEN_WARNING_CODES = new Set<WarningCode>([
  // Świadomie oznaczone jako meteo-only / nieoperacyjne dla ogrodu.
  WarningCode.STORM_RISK,
  WarningCode.HAIL_RISK,
]);

@Injectable()
export class WeatherStatusService {
  constructor(
    private readonly weatherStatusConfigService: WeatherStatusConfigService,
  ) {}

  buildNearTermWeatherStatus(
    snapshotData?: WeatherSnapshotData | null,
    now: Date = new Date(),
  ): BuiltWeatherStatus {
    return this.buildNearTermWeatherStatusWithDebug(snapshotData, now).status;
  }

  buildNearTermWeatherStatusWithDebug(
    snapshotData?: WeatherSnapshotData | null,
    now: Date = new Date(),
  ): { status: BuiltWeatherStatus; debug: NearTermWeatherStatusDebug } {
    const timeZone = snapshotData?.timezone || 'UTC';
    const analyzedHours = this.collectAnalyzedHours(
      snapshotData,
      now,
      timeZone,
    );
    const candidates = this.collectStatusCandidates(analyzedHours, timeZone);
    const selected = candidates[0] ?? null;
    const status: BuiltWeatherStatus =
      selected == null
        ? this.buildCalmStatus()
        : {
            code: selected.code,
            severity: selected.severity,
            title: selected.title,
            subtitle: selected.subtitle,
            startsAt: selected.startsAt,
            endsAt: selected.endsAt,
            validTo: selected.validTo,
            source: selected.source,
          };

    return {
      status,
      debug: {
        timezone: timeZone,
        analyzedHours: analyzedHours.map((hour) => ({
          time: hour.time,
          localTime: formatLocalIso(hour.date, timeZone),
          offsetHours: Number(hour.offsetHours.toFixed(2)),
          isCurrent: hour.isCurrent,
          phenomena: hour.phenomena,
          precip: hour.precip,
          rain: hour.rain,
          snow: hour.snow,
          windSpeed: hour.windSpeed,
          weatherCode: hour.weatherCode,
        })),
        candidates: candidates.map((candidate) => ({
          code: candidate.code,
          timing: candidate.timing,
          score: candidate.score,
          matchedHours: candidate.matchedHours,
        })),
        selectedCode: selected?.code ?? 'CALM',
      },
    };
  }

  buildGardenRiskStatus(warnings: WarningDto[]): BuiltWeatherStatus {
    const relevant = warnings.filter(
      (item) => !NON_GARDEN_WARNING_CODES.has(item.code),
    );

    if (relevant.length === 0) {
      return {
        code: 'OK',
        level: 'ok',
        severity: 'ok',
        title: 'Brak pilnych zagrożeń dla upraw',
        subtitle: 'Nie wykryto ostrzeżeń wymagających działania w ogrodzie.',
        source: 'warnings',
        validTo: null,
        sources: [],
      };
    }

    const hardFrostCodes = new Set<WarningCode>([
      WarningCode.HARD_FROST_RISK_TODAY_NIGHT,
      WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
      WarningCode.HARD_FROST_RISK_NEXT_7_DAYS,
      WarningCode.GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT,
      WarningCode.GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT,
      WarningCode.HARD_FROST_RISK,
      WarningCode.GREENHOUSE_HARD_FROST_PROTECTION,
    ]);
    const frostCodes = new Set<WarningCode>([
      WarningCode.FROST_RISK_TODAY_NIGHT,
      WarningCode.FROST_RISK_TOMORROW_NIGHT,
      WarningCode.FROST_RISK_NEXT_7_DAYS,
      WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT,
      WarningCode.GREENHOUSE_FROST_RISK_TOMORROW_NIGHT,
      WarningCode.FROST_RISK,
    ]);
    const germinationProtectCodes = new Set<WarningCode>([
      WarningCode.GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT,
      WarningCode.GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT,
      WarningCode.GERMINATION_PROTECT_TOO_COLD,
      WarningCode.GREENHOUSE_NIGHT_FROST_PROTECTION,
    ]);
    const sowingPauseCodes = new Set<WarningCode>([
      WarningCode.SOWING_PAUSE_TOO_COLD_TODAY,
      WarningCode.SOWING_PAUSE_TOO_COLD_TOMORROW,
      WarningCode.SOWING_PAUSE_TOO_COLD,
    ]);
    const overwateringCodes = new Set<WarningCode>([
      WarningCode.OVERWATERING_PREPARE_TODAY,
      WarningCode.OVERWATERING_PREPARE_TOMORROW,
      WarningCode.OVERWATERING_CHECK_TODAY,
      WarningCode.OVERWATERING_CHECK_TOMORROW,
      WarningCode.OVERWATERING_PREPARE,
      WarningCode.OVERWATERING_CHECK,
      WarningCode.OVERWATERING_RISK,
      WarningCode.GREENHOUSE_HEAVY_RAIN_CHECK_DRAINAGE,
    ]);
    const windCodes = new Set<WarningCode>([
      WarningCode.WIND_DAMAGE_TODAY_DAY,
      WarningCode.WIND_DAMAGE_TODAY_NIGHT,
      WarningCode.WIND_DAMAGE_TOMORROW_DAY,
      WarningCode.WIND_DAMAGE_TOMORROW_NIGHT,
      WarningCode.WIND_DAMAGE_RISK_NEXT_48H,
      WarningCode.GREENHOUSE_STORM_TODAY_DAY,
      WarningCode.GREENHOUSE_STORM_TOMORROW_DAY,
      WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY,
      WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY,
      WarningCode.GREENHOUSE_STRONG_WIND_SECURE,
      WarningCode.STRONG_WIND,
    ]);
    const heavyRainCodes = new Set<WarningCode>([
      WarningCode.HEAVY_RAIN_TODAY_DAY,
      WarningCode.HEAVY_RAIN_TODAY_NIGHT,
      WarningCode.HEAVY_RAIN_TOMORROW_DAY,
      WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
      WarningCode.HEAVY_RAIN_RISK_NEXT_48H,
      WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY,
      WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY,
      WarningCode.HEAVY_RAIN,
    ]);
    const wateringNeededCodes = new Set<WarningCode>([
      WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
      WarningCode.WATERING_NEEDED_TODAY,
      WarningCode.WATERING_NEEDED_TOMORROW,
      WarningCode.DROUGHT_RISK,
      WarningCode.WATERING_NEEDED,
    ]);

    const prioritizedGroups: Array<{
      codes: Set<WarningCode>;
      statusCode: string;
      level: BuiltWeatherStatusLevel;
      severity: BuiltWeatherStatusSeverity;
      title: string;
      fallbackSubtitle: string;
    }> = [
      {
        codes: hardFrostCodes,
        statusCode: 'HARD_FROST',
        level: 'critical',
        severity: 'danger',
        title: 'Silny przymrozek',
        fallbackSubtitle: 'Nadchodzi okres silnego przymrozku.',
      },
      {
        codes: frostCodes,
        statusCode: 'FROST',
        level: 'warning',
        severity: 'warning',
        title: 'Ryzyko przymrozku',
        fallbackSubtitle: 'Noc może być zbyt chłodna dla roślin.',
      },
      {
        codes: germinationProtectCodes,
        statusCode: 'GERMINATION_PROTECT',
        level: 'warning',
        severity: 'warning',
        title: 'Chroń młode siewki',
        fallbackSubtitle: 'Noc może być zbyt chłodna dla świeżych wysiewów.',
      },
      {
        codes: sowingPauseCodes,
        statusCode: 'SOWING_PAUSE',
        level: 'watch',
        severity: 'warning',
        title: 'Wstrzymaj siew',
        fallbackSubtitle:
          'Warunki są zbyt chłodne dla kiełkowania. Lepiej poczekać z wysiewem.',
      },
      {
        codes: overwateringCodes,
        statusCode: 'OVERWATERING',
        level: 'warning',
        severity: 'warning',
        title: 'Ryzyko nadmiaru wody',
        fallbackSubtitle: 'Sprawdź grządki o słabszym drenażu.',
      },
      {
        codes: windCodes,
        statusCode: 'WIND_DAMAGE',
        level: 'warning',
        severity: 'warning',
        title: 'Silny wiatr',
        fallbackSubtitle: 'Podmuchy mogą uszkadzać rośliny i osłony.',
      },
      {
        codes: heavyRainCodes,
        statusCode: 'HEAVY_RAIN',
        level: 'warning',
        severity: 'warning',
        title: 'Intensywny deszcz',
        fallbackSubtitle: 'Możliwe intensywne opady wpływające na grządki.',
      },
      {
        codes: wateringNeededCodes,
        statusCode: 'WATERING_NEEDED',
        level: 'watch',
        severity: 'info',
        title: 'Może być potrzebne podlewanie',
        fallbackSubtitle: 'Warunki mogą szybko przesuszać podłoże.',
      },
    ];

    for (const group of prioritizedGroups) {
      const matched = relevant.filter((item) => group.codes.has(item.code));
      if (matched.length === 0) {
        continue;
      }

      const primary = this.pickPrimaryWarning(matched);
      return {
        code: group.statusCode,
        level: group.level,
        severity: group.severity,
        title: group.title,
        subtitle: primary.message || group.fallbackSubtitle,
        validTo: primary.validTo ?? null,
        source: 'warnings',
        sources: Array.from(new Set(matched.map((item) => item.code))),
      };
    }

    const fallbackPrimary = this.pickPrimaryWarning(relevant);
    return {
      code: 'GARDEN_WARNING',
      level: this.levelFromWarningSeverity(fallbackPrimary.severity),
      severity: this.statusSeverityFromWarningSeverity(
        fallbackPrimary.severity,
      ),
      title: fallbackPrimary.title || 'Aktywne ostrzeżenie ogrodnicze',
      subtitle:
        fallbackPrimary.message ||
        'Wykryto ostrzeżenie wymagające uwagi w ogrodzie.',
      validTo: fallbackPrimary.validTo ?? null,
      source: 'warnings',
      sources: [fallbackPrimary.code],
    };
  }

  private pickPrimaryWarning(warnings: WarningDto[]): WarningDto {
    return [...warnings].sort((a, b) => {
      const severityDiff =
        WARNING_SEVERITY_RANK[b.severity] - WARNING_SEVERITY_RANK[a.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      const aTime = this.parseWarningDate(a.validFrom);
      const bTime = this.parseWarningDate(b.validFrom);
      if (aTime !== bTime) {
        return aTime - bTime;
      }

      const codeDiff = a.code.localeCompare(b.code);
      if (codeDiff !== 0) {
        return codeDiff;
      }

      return (a.title || '').localeCompare(b.title || '');
    })[0];
  }

  private parseWarningDate(value?: string | null): number {
    if (!value) {
      return Number.POSITIVE_INFINITY;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
  }

  private levelFromWarningSeverity(
    severity: WarningSeverity,
  ): BuiltWeatherStatusLevel {
    if (severity === WarningSeverity.CRITICAL) {
      return 'critical';
    }
    if (severity === WarningSeverity.WARNING) {
      return 'warning';
    }
    return 'watch';
  }

  private statusSeverityFromWarningSeverity(
    severity: WarningSeverity,
  ): BuiltWeatherStatusSeverity {
    if (severity === WarningSeverity.CRITICAL) {
      return 'danger';
    }
    if (severity === WarningSeverity.WARNING) {
      return 'warning';
    }
    return 'info';
  }

  private collectAnalyzedHours(
    snapshotData: WeatherSnapshotData | null | undefined,
    now: Date,
    timeZone: string,
  ): AnalyzedHour[] {
    if (!snapshotData) {
      return [];
    }

    const config = this.weatherStatusConfigService.getNearTermConfig();
    const anchorNow = this.resolveAnchorNow(snapshotData, now, timeZone);
    const lowerBound = new Date(anchorNow.getTime() - 60 * 60 * 1000);
    const upperBound = new Date(
      anchorNow.getTime() + config.nearTermHours * 60 * 60 * 1000,
    );

    const sourceHours: Array<WeatherHourlyPoint & { isCurrent?: boolean }> = [
      {
        time: snapshotData.current.time,
        temp: snapshotData.current.temp,
        precip: snapshotData.current.precip,
        rain: snapshotData.current.rain,
        snow: snapshotData.current.snow,
        wind: snapshotData.current.wind,
        weatherCode: snapshotData.current.weatherCode,
        isDay: snapshotData.current.isDay,
        isCurrent: true,
      },
      ...snapshotData.hourly,
    ];

    const dedupedByHour = new Map<string, AnalyzedHour>();

    for (const hour of sourceHours) {
      const parsed = parseWeatherTime(hour.time, timeZone);
      if (!parsed) {
        continue;
      }

      if (parsed < lowerBound || parsed > upperBound) {
        continue;
      }

      const offsetHours = (parsed.getTime() - anchorNow.getTime()) / 3_600_000;
      const phenomena = this.getWeatherPhenomena(hour, config);
      const hourKey = formatLocalIso(parsed, timeZone).slice(0, 13);
      const candidate: AnalyzedHour = {
        time: hour.time,
        date: parsed,
        weatherCode: hour.weatherCode,
        precip: hour.precip,
        rain: hour.rain,
        snow: hour.snow,
        windSpeed: hour.wind,
        temperature: hour.temp,
        isDay: hour.isDay,
        offsetHours,
        phenomena,
        isCurrent: hour.isCurrent === true,
      };

      const existing = dedupedByHour.get(hourKey);
      if (!existing || (candidate.isCurrent && !existing.isCurrent)) {
        dedupedByHour.set(hourKey, candidate);
      }
    }

    return [...dedupedByHour.values()].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }

  private resolveAnchorNow(
    snapshotData: WeatherSnapshotData,
    now: Date,
    timeZone: string,
  ): Date {
    const snapshotCurrent = parseWeatherTime(
      snapshotData.current.time,
      timeZone,
    );
    if (!snapshotCurrent) {
      return now;
    }

    const distanceMs = Math.abs(now.getTime() - snapshotCurrent.getTime());
    if (distanceMs <= 6 * 60 * 60 * 1000) {
      return now;
    }

    return snapshotCurrent;
  }

  private getWeatherPhenomena(
    hour: Pick<
      WeatherHourlyPoint,
      'precip' | 'rain' | 'snow' | 'wind' | 'weatherCode'
    >,
    config: NearTermWeatherStatusConfig,
  ): NearTermPhenomenon[] {
    const phenomena: NearTermPhenomenon[] = [];

    if (isThunderstormCode(hour.weatherCode)) {
      phenomena.push('THUNDERSTORM');
    }

    if (isHeavyRainHour(hour, config.heavyRainHourlyMm)) {
      phenomena.push('HEAVY_RAIN');
    }

    if (hour.snow > 0 || isSnowCode(hour.weatherCode)) {
      phenomena.push('SNOW');
    }

    if (hour.wind >= config.strongWindKmh) {
      phenomena.push('STRONG_WIND');
    }

    if (
      (hour.precip >= config.rainMinMm ||
        hour.rain >= config.rainMinMm ||
        isRainCode(hour.weatherCode)) &&
      !phenomena.includes('HEAVY_RAIN')
    ) {
      phenomena.push('RAIN');
    }

    return phenomena;
  }

  private collectStatusCandidates(
    analyzedHours: AnalyzedHour[],
    timeZone: string,
  ): StatusCandidate[] {
    const candidates: StatusCandidate[] = [];

    for (const phenomenon of [
      'THUNDERSTORM',
      'HEAVY_RAIN',
      'SNOW',
      'STRONG_WIND',
      'RAIN',
    ] as const) {
      const firstRun = this.findFirstRun(analyzedHours, phenomenon);
      if (!firstRun) {
        continue;
      }

      const start = firstRun[0];
      const end = firstRun[firstRun.length - 1];
      const timing = this.resolveTimingBucket(start.offsetHours);
      const score = PHENOMENON_SCORE[phenomenon] + TIMING_SCORE[timing];
      const startsAt = formatLocalIso(start.date, timeZone);
      const endsAt = formatLocalIso(end.date, timeZone);
      const copy = this.buildNearTermCopy({
        phenomenon,
        timing,
        timeZone,
        start,
        end,
      });

      candidates.push({
        phenomenon,
        timing,
        code: copy.code,
        severity: copy.severity,
        title: copy.title,
        subtitle: copy.subtitle,
        startsAt,
        endsAt,
        validTo: endsAt,
        score,
        source: 'hourly_forecast',
        matchedHours: firstRun.map((item) =>
          formatLocalIso(item.date, timeZone),
        ),
      });
    }

    return candidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const startsAtDiff =
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      if (startsAtDiff !== 0) {
        return startsAtDiff;
      }

      return PHENOMENON_SCORE[b.phenomenon] - PHENOMENON_SCORE[a.phenomenon];
    });
  }

  private findFirstRun(
    analyzedHours: AnalyzedHour[],
    phenomenon: NearTermPhenomenon,
  ): AnalyzedHour[] | null {
    let run: AnalyzedHour[] = [];

    for (const hour of analyzedHours) {
      if (!hour.phenomena.includes(phenomenon)) {
        if (run.length > 0) {
          break;
        }
        continue;
      }

      if (run.length === 0) {
        run = [hour];
        continue;
      }

      const previous = run[run.length - 1];
      const diffMs = hour.date.getTime() - previous.date.getTime();
      if (diffMs <= 75 * 60 * 1000) {
        run.push(hour);
        continue;
      }

      break;
    }

    return run.length > 0 ? run : null;
  }

  private resolveTimingBucket(offsetHours: number): TimingBucket {
    const config = this.weatherStatusConfigService.getNearTermConfig();

    if (offsetHours < 1) {
      return 'NOW';
    }

    if (offsetHours <= config.soonHours) {
      return 'SOON';
    }

    return 'LATER';
  }

  private buildNearTermCopy(params: {
    phenomenon: NearTermPhenomenon;
    timing: TimingBucket;
    timeZone: string;
    start: AnalyzedHour;
    end: AnalyzedHour;
  }): {
    code: string;
    severity: BuiltWeatherStatusSeverity;
    title: string;
    subtitle: string;
  } {
    const code = `${params.phenomenon}_${params.timing}`;
    const severity = this.mapNearTermSeverity(params.phenomenon, params.timing);
    const rangeLabel = this.formatRangeLabel(
      params.start.date,
      params.end.date,
      params.timeZone,
    );

    switch (params.phenomenon) {
      case 'THUNDERSTORM':
        return {
          code,
          severity,
          title: this.resolvePhenomenonTitle(
            'Burze',
            params.timing,
            params.start,
            params.timeZone,
          ),
          subtitle:
            params.timing === 'NOW'
              ? `Burze są możliwe teraz, ${rangeLabel.toLowerCase()}.`
              : `Teraz spokojnie, ale ${rangeLabel.toLowerCase()} możliwe burze.`,
        };
      case 'HEAVY_RAIN':
        return {
          code,
          severity,
          title: this.resolvePhenomenonTitle(
            'Intensywne opady',
            params.timing,
            params.start,
            params.timeZone,
          ),
          subtitle:
            params.timing === 'NOW'
              ? `Silniejszy deszcz trwa teraz, ${rangeLabel.toLowerCase()}.`
              : `${rangeLabel} możliwe intensywniejsze opady.`,
        };
      case 'SNOW':
        return {
          code,
          severity,
          title: this.resolvePhenomenonTitle(
            'Śnieg',
            params.timing,
            params.start,
            params.timeZone,
          ),
          subtitle:
            params.timing === 'NOW'
              ? `Opady śniegu są możliwe teraz, ${rangeLabel.toLowerCase()}.`
              : `${rangeLabel} możliwe opady śniegu.`,
        };
      case 'STRONG_WIND':
        return {
          code,
          severity,
          title: this.resolvePhenomenonTitle(
            'Silniejszy wiatr',
            params.timing,
            params.start,
            params.timeZone,
          ),
          subtitle:
            params.timing === 'NOW'
              ? `Wiatr jest silniejszy już teraz, ${rangeLabel.toLowerCase()}.`
              : `${rangeLabel} wiatr może się wyraźnie nasilić.`,
        };
      case 'RAIN':
      default:
        return {
          code,
          severity,
          title: this.resolvePhenomenonTitle(
            'Deszcz',
            params.timing,
            params.start,
            params.timeZone,
          ),
          subtitle:
            params.timing === 'NOW'
              ? `Pada teraz, ${rangeLabel.toLowerCase()}.`
              : `${rangeLabel} zacznie padać.`,
        };
    }
  }

  private resolvePhenomenonTitle(
    baseLabel: string,
    timing: TimingBucket,
    start: AnalyzedHour,
    timeZone: string,
  ): string {
    if (timing === 'NOW') {
      return `${baseLabel} teraz`;
    }

    if (timing === 'SOON') {
      return `${baseLabel} wkrótce`;
    }

    const hour = getZonedDateTimeParts(start.date, timeZone).hour;
    if (hour >= 12 && hour < 18) {
      return `${baseLabel} po południu`;
    }
    if (hour >= 18 && hour < 23) {
      return `${baseLabel} wieczorem`;
    }
    if (hour >= 5 && hour < 12) {
      return `${baseLabel} rano`;
    }

    return `${baseLabel} później`;
  }

  private formatRangeLabel(start: Date, end: Date, timeZone: string): string {
    const startLabel = formatLocalHour(start, timeZone);
    const endLabel = formatLocalHour(end, timeZone);

    if (startLabel === endLabel) {
      return `Około ${startLabel}`;
    }

    return `Około ${startLabel}–${endLabel}`;
  }

  private mapNearTermSeverity(
    phenomenon: NearTermPhenomenon,
    timing: TimingBucket,
  ): BuiltWeatherStatusSeverity {
    switch (phenomenon) {
      case 'THUNDERSTORM':
        return timing === 'NOW' ? 'danger' : 'warning';
      case 'HEAVY_RAIN':
      case 'SNOW':
      case 'STRONG_WIND':
        return 'warning';
      case 'RAIN':
      default:
        return 'info';
    }
  }

  private buildCalmStatus(): BuiltWeatherStatus {
    return {
      code: 'CALM',
      level: 'ok',
      severity: 'ok',
      title: 'Spokojnie',
      subtitle: 'W najbliższych godzinach nie widać istotnych zmian pogody.',
      source: 'hourly_forecast',
      validTo: null,
    };
  }
}
