import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  WarningCode,
  WarningRuleCategory,
  WarningRuleDayPart,
  WarningRuleHorizon,
  WarningSeverity,
} from '../../common/enums/warning.enums';
import { WarningRule } from '../../warning-rules/warning-rule.entity';
import { WeatherWarningConfig } from './weather-warning-config.entity';
import { WeatherWarningConfigService } from './weather-warning-config.service';

type WarningRuleSeed = {
  code: WarningCode;
  title: string;
  messageTemplate: string;
  hintTemplate?: string;
  severity?: WarningSeverity;
  category: WarningRuleCategory;
  horizon: WarningRuleHorizon;
  dayPart: WarningRuleDayPart;
  generatesTask: boolean;
  enabled?: boolean;
  isActive?: boolean;
};

@Injectable()
export class WeatherWarningsSeedService implements OnModuleInit {
  private readonly logger = new Logger(WeatherWarningsSeedService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly configService: WeatherWarningConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.upsertWarningRuleSeeds();
    await this.upsertConfigSeeds();
    this.logger.log('Weather warning rules/config seeds upserted');
  }

  private async upsertWarningRuleSeeds() {
    const seeds: WarningRuleSeed[] = [
      {
        code: WarningCode.FROST_RISK_NEXT_7_DAYS,
        title: 'Radar: możliwy przymrozek nocą (7 dni)',
        messageTemplate:
          'W najbliższych 7 dniach nocą/przed świtem możliwy spadek temperatury do {minTempC}°C (próg {thresholdC}°C).',
        hintTemplate:
          'To alert radarowy. Taski powstają tylko dla kodów Dziś/Jutro.',
        severity: WarningSeverity.CRITICAL,
        category: WarningRuleCategory.WEATHER_OUTDOOR,
        horizon: WarningRuleHorizon.RADAR,
        dayPart: WarningRuleDayPart.NIGHT,
        generatesTask: false,
      },
      {
        code: WarningCode.HARD_FROST_RISK_NEXT_7_DAYS,
        title: 'Radar: możliwy silny mróz nocą (7 dni)',
        messageTemplate:
          'W najbliższych 7 dniach nocą/przed świtem możliwy silny mróz: {minTempC}°C (próg {thresholdC}°C).',
        severity: WarningSeverity.CRITICAL,
        category: WarningRuleCategory.WEATHER_OUTDOOR,
        horizon: WarningRuleHorizon.RADAR,
        dayPart: WarningRuleDayPart.NIGHT,
        generatesTask: false,
      },
      {
        code: WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
        title: 'Radar: ryzyko suszy (7 dni)',
        messageTemplate:
          'Suma opadów 7d to {precipSumMm} mm (próg {thresholdMm} mm).',
        category: WarningRuleCategory.WEATHER_OUTDOOR,
        horizon: WarningRuleHorizon.RADAR,
        dayPart: WarningRuleDayPart.ANY,
        generatesTask: false,
      },
      {
        code: WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH,
        title: 'Presja chorób grzybowych (wyłączone)',
        messageTemplate: 'Kod wyłączony: wymaga sensorów wilgotności.',
        category: WarningRuleCategory.WEATHER_OUTDOOR,
        horizon: WarningRuleHorizon.RADAR,
        dayPart: WarningRuleDayPart.ANY,
        generatesTask: false,
        enabled: false,
        isActive: false,
      },
      {
        code: WarningCode.OVERWATERING_RISK,
        title: 'Ryzyko przelania grządki (wyłączone)',
        messageTemplate: 'Kod zastąpiony przez OVERWATERING_PREPARE/CHECK.',
        category: WarningRuleCategory.WEATHER_OUTDOOR,
        horizon: WarningRuleHorizon.RADAR,
        dayPart: WarningRuleDayPart.ANY,
        generatesTask: false,
        enabled: false,
        isActive: false,
      },
      {
        code: WarningCode.GERMINATION_TOO_COLD,
        title: 'Za zimno na kiełkowanie (wyłączone)',
        messageTemplate:
          'Kod zastąpiony przez SOWING_PAUSE_* i GERMINATION_PROTECT_*.',
        category: WarningRuleCategory.WEATHER_OUTDOOR,
        horizon: WarningRuleHorizon.RADAR,
        dayPart: WarningRuleDayPart.ANY,
        generatesTask: false,
        enabled: false,
        isActive: false,
      },
      ...this.operationalSeeds(),
      ...this.greenhouseSeeds(),
    ];

    for (const seed of seeds) {
      let rule = await this.em.findOne(WarningRule, { code: seed.code });
      if (!rule) {
        rule = new WarningRule();
        rule.code = seed.code;
        rule.blocking = false;
      }

      rule.severity = seed.severity ?? WarningSeverity.WARNING;
      rule.enabled = seed.enabled ?? true;
      rule.isActive = seed.isActive ?? true;
      rule.category = seed.category;
      rule.horizon = seed.horizon;
      rule.dayPart = seed.dayPart;
      rule.generatesTask = seed.generatesTask;
      rule.title = seed.title;
      rule.messageTemplate = seed.messageTemplate;
      rule.hintTemplate = seed.hintTemplate ?? null;

      this.em.persist(rule);
    }

    await this.em.flush();
  }

  private async upsertConfigSeeds() {
    const entries = this.configService
      .getDefaultConfigEntries()
      .filter((entry) =>
        [
          WarningCode.FROST_RISK_NEXT_7_DAYS,
          WarningCode.HARD_FROST_RISK_NEXT_7_DAYS,
          WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
          WarningCode.FROST_RISK_TODAY_NIGHT,
          WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT,
        ].includes(entry.code),
      );

    for (const entry of entries) {
      let row = await this.em.findOne(WeatherWarningConfig, {
        code: entry.code,
      });
      if (!row) {
        row = new WeatherWarningConfig();
        row.code = entry.code;
        row.params = entry.params;
        row.isActive = true;
        row.version = 1;
        this.em.persist(row);
      }
    }

    await this.em.flush();
  }

  private operationalSeeds(): WarningRuleSeed[] {
    const rows: Array<{
      code: WarningCode;
      title: string;
      message: string;
      dayPart: WarningRuleDayPart;
    }> = [
      {
        code: WarningCode.FROST_RISK_TODAY_NIGHT,
        title: 'Dziś w nocy: ryzyko przymrozku',
        message:
          '{dayLabel} {dayPartLabel} możliwy spadek temperatury do {minTempC}°C (próg {thresholdC}°C).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.FROST_RISK_TOMORROW_NIGHT,
        title: 'Jutro w nocy: ryzyko przymrozku',
        message:
          '{dayLabel} {dayPartLabel} możliwy spadek temperatury do {minTempC}°C (próg {thresholdC}°C).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.HARD_FROST_RISK_TODAY_NIGHT,
        title: 'Dziś w nocy: ryzyko silnego mrozu',
        message:
          '{dayLabel} {dayPartLabel} możliwy silny mróz do {minTempC}°C (próg {thresholdC}°C).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
        title: 'Jutro w nocy: ryzyko silnego mrozu',
        message:
          '{dayLabel} {dayPartLabel} możliwy silny mróz do {minTempC}°C (próg {thresholdC}°C).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.HEAVY_RAIN_TODAY_DAY,
        title: 'Dziś w dzień: intensywne opady',
        message:
          '{dayLabel} {dayPartLabel}: suma opadów {precipSumMm} mm (próg {thresholdMm} mm).',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.HEAVY_RAIN_TODAY_NIGHT,
        title: 'Dziś w nocy: intensywne opady',
        message:
          '{dayLabel} {dayPartLabel}: suma opadów {precipSumMm} mm (próg {thresholdMm} mm).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.HEAVY_RAIN_TOMORROW_DAY,
        title: 'Jutro w dzień: intensywne opady',
        message:
          '{dayLabel} {dayPartLabel}: suma opadów {precipSumMm} mm (próg {thresholdMm} mm).',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
        title: 'Jutro w nocy: intensywne opady',
        message:
          '{dayLabel} {dayPartLabel}: suma opadów {precipSumMm} mm (próg {thresholdMm} mm).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.WIND_DAMAGE_TODAY_DAY,
        title: 'Dziś w dzień: ryzyko szkód od wiatru',
        message:
          '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h (próg {thresholdKmh} km/h).',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.WIND_DAMAGE_TODAY_NIGHT,
        title: 'Dziś w nocy: ryzyko szkód od wiatru',
        message:
          '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h (próg {thresholdKmh} km/h).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.WIND_DAMAGE_TOMORROW_DAY,
        title: 'Jutro w dzień: ryzyko szkód od wiatru',
        message:
          '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h (próg {thresholdKmh} km/h).',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.WIND_DAMAGE_TOMORROW_NIGHT,
        title: 'Jutro w nocy: ryzyko szkód od wiatru',
        message:
          '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h (próg {thresholdKmh} km/h).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.WATERING_NEEDED_TODAY,
        title: 'Dziś: podlewanie operacyjne',
        message:
          '{dayLabel}: niskie opady ({precipSumMm} mm) i warunki parowania wskazują na potrzebę podlewania.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.WATERING_NEEDED_TOMORROW,
        title: 'Jutro: podlewanie operacyjne',
        message:
          '{dayLabel}: niskie opady ({precipSumMm} mm) i warunki parowania wskazują na potrzebę podlewania.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.SOWING_PAUSE_TOO_COLD_TODAY,
        title: 'Dziś: wstrzymaj siew (za zimno)',
        message:
          '{dayLabel}: dla {vegetableName} na {bedName} jest za zimno na bezpieczny siew.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.SOWING_PAUSE_TOO_COLD_TOMORROW,
        title: 'Jutro: wstrzymaj siew (za zimno)',
        message:
          '{dayLabel}: dla {vegetableName} na {bedName} jest za zimno na bezpieczny siew.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT,
        title: 'Dziś w nocy: osłoń kiełkujące rośliny',
        message:
          '{dayLabel} {dayPartLabel}: {vegetableName} na {bedName} wymaga osłony (min {minTempC}°C).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT,
        title: 'Jutro w nocy: osłoń kiełkujące rośliny',
        message:
          '{dayLabel} {dayPartLabel}: {vegetableName} na {bedName} wymaga osłony (min {minTempC}°C).',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.OVERWATERING_PREPARE_TODAY,
        title: 'Dziś: przygotuj drenaż',
        message:
          '{dayLabel}: w {bedName} przygotuj odpływ przed opadami ({precipSumMm} mm).',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.OVERWATERING_PREPARE_TOMORROW,
        title: 'Jutro: przygotuj drenaż',
        message:
          '{dayLabel}: w {bedName} przygotuj odpływ przed opadami ({precipSumMm} mm).',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.OVERWATERING_CHECK_TODAY,
        title: 'Dziś: sprawdź zastoiska wody',
        message:
          '{dayLabel}: po opadach skontroluj {bedName} pod kątem zastoisk i drenażu.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.OVERWATERING_CHECK_TOMORROW,
        title: 'Jutro: sprawdź zastoiska wody',
        message:
          '{dayLabel}: po opadach skontroluj {bedName} pod kątem zastoisk i drenażu.',
        dayPart: WarningRuleDayPart.ANY,
      },
    ];

    return rows.map((row) => ({
      code: row.code,
      title: row.title,
      messageTemplate: row.message,
      category: WarningRuleCategory.WEATHER_OUTDOOR,
      horizon: WarningRuleHorizon.OPERATIONAL,
      dayPart: row.dayPart,
      generatesTask: true,
      severity: WarningSeverity.WARNING,
    }));
  }

  private greenhouseSeeds(): WarningRuleSeed[] {
    const rows: Array<{
      code: WarningCode;
      title: string;
      message: string;
      dayPart: WarningRuleDayPart;
      generatesTask?: boolean;
    }> = [
      {
        code: WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT,
        title: 'Szklarnia/tunel: dziś w nocy ryzyko przymrozku',
        message: '{dayLabel} {dayPartLabel}: możliwy mróz do {minTempC}°C.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GREENHOUSE_FROST_RISK_TOMORROW_NIGHT,
        title: 'Szklarnia/tunel: jutro w nocy ryzyko przymrozku',
        message: '{dayLabel} {dayPartLabel}: możliwy mróz do {minTempC}°C.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT,
        title: 'Szklarnia/tunel: dziś w nocy ryzyko silnego mrozu',
        message:
          '{dayLabel} {dayPartLabel}: możliwy silny mróz do {minTempC}°C.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT,
        title: 'Szklarnia/tunel: jutro w nocy ryzyko silnego mrozu',
        message:
          '{dayLabel} {dayPartLabel}: możliwy silny mróz do {minTempC}°C.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GREENHOUSE_HEAT_WAVE_TODAY_DAY,
        title: 'Szklarnia/tunel: dziś w dzień ryzyko przegrzania',
        message:
          '{dayLabel} {dayPartLabel}: temperatura może wzrosnąć do {maxTempC}°C.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_HEAT_WAVE_TOMORROW_DAY,
        title: 'Szklarnia/tunel: jutro w dzień ryzyko przegrzania',
        message:
          '{dayLabel} {dayPartLabel}: temperatura może wzrosnąć do {maxTempC}°C.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY,
        title: 'Szklarnia/tunel: dziś w dzień silny wiatr',
        message: '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY,
        title: 'Szklarnia/tunel: jutro w dzień silny wiatr',
        message: '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_STORM_TODAY_DAY,
        title: 'Szklarnia/tunel: dziś w dzień ryzyko burzy',
        message:
          '{dayLabel} {dayPartLabel}: ryzyko burzowych porywów i opadów.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_STORM_TOMORROW_DAY,
        title: 'Szklarnia/tunel: jutro w dzień ryzyko burzy',
        message:
          '{dayLabel} {dayPartLabel}: ryzyko burzowych porywów i opadów.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY,
        title: 'Szklarnia/tunel: dziś w dzień intensywny deszcz',
        message: '{dayLabel} {dayPartLabel}: opad {precipSumMm} mm.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY,
        title: 'Szklarnia/tunel: jutro w dzień intensywny deszcz',
        message: '{dayLabel} {dayPartLabel}: opad {precipSumMm} mm.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_SNOW_LOAD_TODAY,
        title: 'Szklarnia/tunel: dziś ryzyko obciążenia śniegiem',
        message:
          '{dayLabel}: śnieg może obciążyć konstrukcję ({snowSumMm} mm).',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_SNOW_LOAD_TOMORROW,
        title: 'Szklarnia/tunel: jutro ryzyko obciążenia śniegiem',
        message:
          '{dayLabel}: śnieg może obciążyć konstrukcję ({snowSumMm} mm).',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_WET_SNOW_TODAY,
        title: 'Szklarnia/tunel: dziś ryzyko mokrego śniegu',
        message:
          '{dayLabel}: mokry śnieg zwiększa ryzyko uszkodzeń ({wetSnowMm} mm).',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_WET_SNOW_TOMORROW,
        title: 'Szklarnia/tunel: jutro ryzyko mokrego śniegu',
        message:
          '{dayLabel}: mokry śnieg zwiększa ryzyko uszkodzeń ({wetSnowMm} mm).',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TODAY,
        title: 'Szklarnia/tunel: dziś nagły spadek temperatury',
        message:
          '{dayLabel}: możliwy nagły spadek temperatury ({tempDropC}°C).',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW,
        title: 'Szklarnia/tunel: jutro nagły spadek temperatury',
        message:
          '{dayLabel}: możliwy nagły spadek temperatury ({tempDropC}°C).',
        dayPart: WarningRuleDayPart.ANY,
      },
    ];

    return rows.map((row) => ({
      code: row.code,
      title: row.title,
      messageTemplate: row.message,
      category: WarningRuleCategory.WEATHER_GREENHOUSE,
      horizon: WarningRuleHorizon.OPERATIONAL,
      dayPart: row.dayPart,
      generatesTask: row.generatesTask ?? true,
      severity: WarningSeverity.WARNING,
    }));
  }
}
