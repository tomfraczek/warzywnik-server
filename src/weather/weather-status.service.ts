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

type BuiltWeatherStatus = {
  code: string;
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
    const severityRank: Record<WarningSeverity, number> = {
      [WarningSeverity.INFO]: 1,
      [WarningSeverity.WARNING]: 2,
      [WarningSeverity.CRITICAL]: 3,
    };

    const sorted = [...warnings].sort(
      (a, b) => severityRank[b.severity] - severityRank[a.severity],
    );

    const pick = (codes: Set<WarningCode>) =>
      sorted.filter((item) => codes.has(item.code));

    const hardFrostCodes = new Set<WarningCode>([
      WarningCode.HARD_FROST_RISK_TODAY_NIGHT,
      WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
      WarningCode.HARD_FROST_RISK_NEXT_7_DAYS,
      WarningCode.GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT,
      WarningCode.GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT,
    ]);
    const frostCodes = new Set<WarningCode>([
      WarningCode.FROST_RISK_TODAY_NIGHT,
      WarningCode.FROST_RISK_TOMORROW_NIGHT,
      WarningCode.FROST_RISK_NEXT_7_DAYS,
      WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT,
      WarningCode.GREENHOUSE_FROST_RISK_TOMORROW_NIGHT,
    ]);
    const stormCodes = new Set<WarningCode>([
      WarningCode.WIND_DAMAGE_TODAY_DAY,
      WarningCode.WIND_DAMAGE_TODAY_NIGHT,
      WarningCode.WIND_DAMAGE_TOMORROW_DAY,
      WarningCode.WIND_DAMAGE_TOMORROW_NIGHT,
      WarningCode.WIND_DAMAGE_RISK_NEXT_48H,
      WarningCode.GREENHOUSE_STORM_TODAY_DAY,
      WarningCode.GREENHOUSE_STORM_TOMORROW_DAY,
      WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY,
      WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY,
    ]);
    const rainCodes = new Set<WarningCode>([
      WarningCode.HEAVY_RAIN_TODAY_DAY,
      WarningCode.HEAVY_RAIN_TODAY_NIGHT,
      WarningCode.HEAVY_RAIN_TOMORROW_DAY,
      WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
      WarningCode.HEAVY_RAIN_RISK_NEXT_48H,
      WarningCode.OVERWATERING_PREPARE_TODAY,
      WarningCode.OVERWATERING_PREPARE_TOMORROW,
      WarningCode.OVERWATERING_CHECK_TODAY,
      WarningCode.OVERWATERING_CHECK_TOMORROW,
      WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY,
      WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY,
    ]);
    const droughtCodes = new Set<WarningCode>([
      WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
      WarningCode.WATERING_NEEDED_TODAY,
      WarningCode.WATERING_NEEDED_TOMORROW,
      WarningCode.DROUGHT_RISK,
      WarningCode.WATERING_NEEDED,
    ]);

    const toStatus = (
      code: string,
      title: string,
      severity: BuiltWeatherStatusSeverity,
      matched: WarningDto[],
    ): BuiltWeatherStatus => ({
      code,
      severity,
      title,
      subtitle: matched[0]?.message ?? matched[0]?.title ?? title,
      validTo: matched[0]?.validTo ?? null,
      source: 'warnings',
      sources: Array.from(new Set(matched.map((item) => item.code))),
    });

    const hardFrost = pick(hardFrostCodes);
    if (hardFrost.length > 0) {
      return toStatus(
        'HARD_FROST',
        'Nadchodzi silny mróz',
        'danger',
        hardFrost,
      );
    }

    const frost = pick(frostCodes);
    if (frost.length > 0) {
      return toStatus('FROST', 'Nadchodzą przymrozki', 'warning', frost);
    }

    const storms = pick(stormCodes);
    if (storms.length > 0) {
      return toStatus(
        'STORM',
        'Zbliżają się gwałtowne zjawiska',
        storms[0]?.severity === WarningSeverity.CRITICAL ? 'danger' : 'warning',
        storms,
      );
    }

    const rains = pick(rainCodes);
    if (rains.length > 0) {
      return toStatus(
        'HEAVY_RAIN',
        'Możliwe intensywne opady',
        'warning',
        rains,
      );
    }

    const drought = pick(droughtCodes);
    if (drought.length > 0) {
      return toStatus(
        'DROUGHT',
        'Uwaga na suszę i przesuszenie',
        drought[0]?.severity === WarningSeverity.INFO ? 'info' : 'warning',
        drought,
      );
    }

    return {
      code: 'OK',
      severity: 'ok',
      title: 'Brak pilnych zagrożeń dla upraw',
      subtitle: 'Nie wykryto ostrzeżeń wymagających działania w ogrodzie.',
      source: 'warnings',
      validTo: null,
      sources: [],
    };
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
      severity: 'ok',
      title: 'Spokojnie',
      subtitle: 'W najbliższych godzinach nie widać istotnych zmian pogody.',
      source: 'hourly_forecast',
      validTo: null,
    };
  }
}
