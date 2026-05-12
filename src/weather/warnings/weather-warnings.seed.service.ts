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

const hintUpdatesByCode: Record<string, string> = {
  HEAVY_RAIN_TODAY_DAY:
    'Sprawdź odpływ wody, drożność międzyrzędzi i miejsca, gdzie może tworzyć się zastój. W miarę możliwości wstrzymaj podlewanie i po opadach oceń, czy gleba nie jest zbita lub zalana.',
  HEAVY_RAIN_TODAY_NIGHT:
    'Sprawdź odpływ wody, drożność międzyrzędzi i miejsca, gdzie może tworzyć się zastój. W miarę możliwości wstrzymaj podlewanie i po opadach oceń, czy gleba nie jest zbita lub zalana.',
  HEAVY_RAIN_TOMORROW_DAY:
    'Sprawdź odpływ wody, drożność międzyrzędzi i miejsca, gdzie może tworzyć się zastój. W miarę możliwości wstrzymaj podlewanie i po opadach oceń, czy gleba nie jest zbita lub zalana.',
  HEAVY_RAIN_TOMORROW_NIGHT:
    'Sprawdź odpływ wody, drożność międzyrzędzi i miejsca, gdzie może tworzyć się zastój. W miarę możliwości wstrzymaj podlewanie i po opadach oceń, czy gleba nie jest zbita lub zalana.',

  WIND_DAMAGE_TODAY_DAY:
    'Zabezpiecz podpory, podwiąż wyższe rośliny i usuń lekkie elementy, które może porwać wiatr. Po zdarzeniu sprawdź uszkodzenia pędów, liści i ewentualne przechylenie roślin.',
  WIND_DAMAGE_TODAY_NIGHT:
    'Zabezpiecz podpory, podwiąż wyższe rośliny i usuń lekkie elementy, które może porwać wiatr. Po zdarzeniu sprawdź uszkodzenia pędów, liści i ewentualne przechylenie roślin.',
  WIND_DAMAGE_TOMORROW_DAY:
    'Zabezpiecz podpory, podwiąż wyższe rośliny i usuń lekkie elementy, które może porwać wiatr. Po zdarzeniu sprawdź uszkodzenia pędów, liści i ewentualne przechylenie roślin.',
  WIND_DAMAGE_TOMORROW_NIGHT:
    'Zabezpiecz podpory, podwiąż wyższe rośliny i usuń lekkie elementy, które może porwać wiatr. Po zdarzeniu sprawdź uszkodzenia pędów, liści i ewentualne przechylenie roślin.',

  GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT:
    'Osłoń kiełkujące lub świeżo wzeszłe rośliny agrowłókniną, mini tunelem albo inną lekką osłoną. Najbardziej wrażliwy jest etap wschodów i pierwszych liścieni.',
  GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT:
    'Osłoń kiełkujące lub świeżo wzeszłe rośliny agrowłókniną, mini tunelem albo inną lekką osłoną. Najbardziej wrażliwy jest etap wschodów i pierwszych liścieni.',

  FROST_RISK_TODAY_NIGHT:
    'Przygotuj osłonę dla roślin wrażliwych na chłód, szczególnie młodych warzyw ciepłolubnych. Rano sprawdź liście i wstrzymaj cięcie lub inne zabiegi do czasu oceny uszkodzeń.',
  FROST_RISK_TOMORROW_NIGHT:
    'Przygotuj osłonę dla roślin wrażliwych na chłód, szczególnie młodych warzyw ciepłolubnych. Rano sprawdź liście i wstrzymaj cięcie lub inne zabiegi do czasu oceny uszkodzeń.',

  HARD_FROST_RISK_TODAY_NIGHT:
    'Zastosuj mocniejsze zabezpieczenie niż przy zwykłym przymrozku: kilka warstw osłony, przeniesienie pojemników albo dodatkowe zabezpieczenie konstrukcji. Przy dłuższym okresie chłodu zaplanuj ochronę z wyprzedzeniem.',
  HARD_FROST_RISK_TOMORROW_NIGHT:
    'Zastosuj mocniejsze zabezpieczenie niż przy zwykłym przymrozku: kilka warstw osłony, przeniesienie pojemników albo dodatkowe zabezpieczenie konstrukcji. Przy dłuższym okresie chłodu zaplanuj ochronę z wyprzedzeniem.',
  HARD_FROST_RISK_NEXT_7_DAYS:
    'Zastosuj mocniejsze zabezpieczenie niż przy zwykłym przymrozku: kilka warstw osłony, przeniesienie pojemników albo dodatkowe zabezpieczenie konstrukcji. Przy dłuższym okresie chłodu zaplanuj ochronę z wyprzedzeniem.',

  WATERING_NEEDED_TODAY:
    'Sprawdź wilgotność gleby w strefie korzeniowej, nie tylko na powierzchni. Jeśli podłoże jest suche głębiej, wykonaj rzadsze, ale obfitsze podlewanie zamiast lekkiego zraszania.',
  WATERING_NEEDED_TOMORROW:
    'Sprawdź wilgotność gleby w strefie korzeniowej, nie tylko na powierzchni. Jeśli podłoże jest suche głębiej, wykonaj rzadsze, ale obfitsze podlewanie zamiast lekkiego zraszania.',

  OVERWATERING_PREPARE_TODAY:
    'Przed opadami udrożnij odpływ wody, sprawdź brzegi grządki i usuń przeszkody, które zatrzymują spływ. Najlepiej działać zanim gleba zostanie zalana.',
  OVERWATERING_PREPARE_TOMORROW:
    'Przed opadami udrożnij odpływ wody, sprawdź brzegi grządki i usuń przeszkody, które zatrzymują spływ. Najlepiej działać zanim gleba zostanie zalana.',

  OVERWATERING_CHECK_TODAY:
    'Po opadach sprawdź, czy woda nie stoi w zagłębieniach i czy gleba nie jest lepka oraz pozbawiona przewiewności. Wstrzymaj kolejne podlewanie do czasu poprawy warunków powietrzno-wodnych.',
  OVERWATERING_CHECK_TOMORROW:
    'Po opadach sprawdź, czy woda nie stoi w zagłębieniach i czy gleba nie jest lepka oraz pozbawiona przewiewności. Wstrzymaj kolejne podlewanie do czasu poprawy warunków powietrzno-wodnych.',

  SOWING_PAUSE_TOO_COLD_TODAY:
    'Wstrzymaj siew do czasu poprawy temperatury gleby i warunków startowych. Zbyt wczesny siew często wydłuża wschody i zwiększa ryzyko nierównomiernego rozwoju.',
  SOWING_PAUSE_TOO_COLD_TOMORROW:
    'Wstrzymaj siew do czasu poprawy temperatury gleby i warunków startowych. Zbyt wczesny siew często wydłuża wschody i zwiększa ryzyko nierównomiernego rozwoju.',

  GREENHOUSE_SUDDEN_TEMP_DROP_TODAY:
    'Sprawdź możliwość domknięcia szklarni lub tunelu przed nocą i przygotuj dodatkową osłonę dla najwrażliwszych roślin. Gwałtowny spadek temperatury jest szczególnie niebezpieczny przy dużej amplitudzie dobowej.',
  GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW:
    'Sprawdź możliwość domknięcia szklarni lub tunelu przed nocą i przygotuj dodatkową osłonę dla najwrażliwszych roślin. Gwałtowny spadek temperatury jest szczególnie niebezpieczny przy dużej amplitudzie dobowej.',

  GREENHOUSE_WET_SNOW_TODAY:
    'Kontroluj dach i poszycie konstrukcji, ponieważ mokry śnieg szybko zwiększa obciążenie. W razie potrzeby usuń śnieg możliwie wcześnie i sprawdź newralgiczne punkty stelaża.',
  GREENHOUSE_WET_SNOW_TOMORROW:
    'Kontroluj dach i poszycie konstrukcji, ponieważ mokry śnieg szybko zwiększa obciążenie. W razie potrzeby usuń śnieg możliwie wcześnie i sprawdź newralgiczne punkty stelaża.',

  GREENHOUSE_SNOW_LOAD_TODAY:
    'Sprawdź wytrzymałość konstrukcji, podpory i miejsca łączeń. Przy ryzyku dużego obciążenia nie czekaj na odkształcenie — usuń zalegający śnieg jak najszybciej.',
  GREENHOUSE_SNOW_LOAD_TOMORROW:
    'Sprawdź wytrzymałość konstrukcji, podpory i miejsca łączeń. Przy ryzyku dużego obciążenia nie czekaj na odkształcenie — usuń zalegający śnieg jak najszybciej.',

  GREENHOUSE_HEAVY_RAIN_TODAY_DAY:
    'Skontroluj odpływ wody wokół szklarni lub tunelu, rynny i miejsca, gdzie może dochodzić do podmakania wejść albo boków konstrukcji. Problem często dotyczy otoczenia obiektu bardziej niż samego wnętrza.',
  GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY:
    'Skontroluj odpływ wody wokół szklarni lub tunelu, rynny i miejsca, gdzie może dochodzić do podmakania wejść albo boków konstrukcji. Problem często dotyczy otoczenia obiektu bardziej niż samego wnętrza.',

  GREENHOUSE_STORM_TODAY_DAY:
    'Sprawdź zamknięcia, mocowania folii lub szyb oraz stabilność drzwi i wietrzników. Burza może uszkodzić zarówno konstrukcję, jak i rośliny ustawione przy wejściach oraz ścianach.',
  GREENHOUSE_STORM_TOMORROW_DAY:
    'Sprawdź zamknięcia, mocowania folii lub szyb oraz stabilność drzwi i wietrzników. Burza może uszkodzić zarówno konstrukcję, jak i rośliny ustawione przy wejściach oraz ścianach.',

  GREENHOUSE_HEAT_WAVE_TODAY_DAY:
    'Zadbaj o przewietrzanie, cieniowanie i kontrolę temperatury wewnątrz obiektu. W uprawie pod osłonami stres cieplny narasta szybciej niż w gruncie, nawet gdy na zewnątrz warunki wydają się jeszcze akceptowalne.',
  GREENHOUSE_HEAT_WAVE_TOMORROW_DAY:
    'Zadbaj o przewietrzanie, cieniowanie i kontrolę temperatury wewnątrz obiektu. W uprawie pod osłonami stres cieplny narasta szybciej niż w gruncie, nawet gdy na zewnątrz warunki wydają się jeszcze akceptowalne.',

  GREENHOUSE_STRONG_WIND_TODAY_DAY:
    'Sprawdź mocowanie konstrukcji, folii, drzwi i elementów ruchomych. Zabezpiecz lekkie wyposażenie oraz wszystko, co może uderzać o osłonę podczas podmuchów.',
  GREENHOUSE_STRONG_WIND_TOMORROW_DAY:
    'Sprawdź mocowanie konstrukcji, folii, drzwi i elementów ruchomych. Zabezpiecz lekkie wyposażenie oraz wszystko, co może uderzać o osłonę podczas podmuchów.',

  GREENHOUSE_FROST_RISK_TODAY_NIGHT:
    'Pod osłoną temperatura również może spaść do poziomu groźnego dla roślin ciepłolubnych. Rozważ dodatkową warstwę ochrony wewnątrz obiektu lub czasowe dogrzanie, jeśli taki wariant jest dostępny.',
  GREENHOUSE_FROST_RISK_TOMORROW_NIGHT:
    'Pod osłoną temperatura również może spaść do poziomu groźnego dla roślin ciepłolubnych. Rozważ dodatkową warstwę ochrony wewnątrz obiektu lub czasowe dogrzanie, jeśli taki wariant jest dostępny.',

  GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT:
    'Przy silnym mrozie sama osłona konstrukcyjna może nie wystarczyć. Warto połączyć zamknięcie obiektu z dodatkową osłoną roślin, izolacją pojemników lub inną formą awaryjnego zabezpieczenia.',
  GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT:
    'Przy silnym mrozie sama osłona konstrukcyjna może nie wystarczyć. Warto połączyć zamknięcie obiektu z dodatkową osłoną roślin, izolacją pojemników lub inną formą awaryjnego zabezpieczenia.',

  FUNGAL_DISEASE_PRESSURE_HIGH:
    'Po uruchomieniu tej reguły warto łączyć ją z wilgotnością liścia, czasem zwilżenia i przewietrzaniem. Sama pogoda bywa niewystarczająca do trafnego alarmu dla chorób grzybowych.',
  OVERWATERING_RISK:
    'Ten kod został zastąpiony przez bardziej operacyjne warningi PREPARE i CHECK. Jeśli wróci do użycia, powinien pełnić rolę ogólnego sygnału wstępnego, a nie końcowej rekomendacji.',
  GERMINATION_TOO_COLD:
    'Ten kod został zastąpiony przez rozdzielenie na wstrzymanie siewu i ochronę kiełkujących roślin. W obecnym modelu lepiej zostawić go wyłączonego, żeby nie dublować komunikatów.',
};

const cooldownUpdatesByCode: Record<string, number> = {
  DRAINAGE_MISMATCH: 30,
  HARVEST_WINDOW_MISSED: 7,
  PH_OUT_OF_RANGE: 30,
  WATER_RETENTION_MISMATCH: 30,
  ROTATION_RISK: 30,
  DEPTH_TOO_SMALL: 60,
  SUBOPTIMAL_SOWING_TIME: 7,
  FAMILY_REPETITION: 30,
  EXPERIMENTAL_SETUP: 30,
  SOIL_NOT_RECOMMENDED: 30,
  NPK_TOO_LOW: 21,
};

const cooldownFixesByCode: Record<string, number> = {
  HARD_FROST_RISK_NEXT_7_DAYS: 1,
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
          'W najbliższych 7 dniach nocą/przed świtem temperatura może spaść do {minTempC}°C (próg {thresholdC}°C), co zwiększa ryzyko uszkodzenia młodych liści, zahamowania wzrostu i stresu chłodowego u roślin wrażliwych.',
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
          'W najbliższych 7 dniach nocą/przed świtem możliwy jest silny mróz do {minTempC}°C (próg {thresholdC}°C), który może powodować poważne uszkodzenia tkanek, zamieranie wierzchołków wzrostu i straty w uprawach wrażliwych.',
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
          'Suma opadów z 7 dni wynosi tylko {precipSumMm} mm (próg {thresholdMm} mm), więc gleba może wyraźnie przesychać, a rośliny mogą mieć utrudnione pobieranie wody i składników pokarmowych.',
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
      rule.hintTemplate =
        hintUpdatesByCode[seed.code] ??
        seed.hintTemplate ??
        rule.hintTemplate ??
        null;
      rule.cooldownDays =
        cooldownUpdatesByCode[seed.code] ??
        cooldownFixesByCode[seed.code] ??
        rule.cooldownDays ??
        null;

      this.em.persist(rule);
    }

    await this.em.flush();

    await this.applyGlobalRuleOverrides();
    await this.validateRuleSeedState();
  }

  private async applyGlobalRuleOverrides(): Promise<void> {
    const codes = Array.from(
      new Set([
        ...Object.keys(hintUpdatesByCode),
        ...Object.keys(cooldownUpdatesByCode),
        ...Object.keys(cooldownFixesByCode),
      ]),
    ) as WarningCode[];

    const rules = await this.em.find(WarningRule, {
      code: { $in: codes },
    });

    for (const rule of rules) {
      rule.hintTemplate =
        hintUpdatesByCode[rule.code] ?? rule.hintTemplate ?? null;
      rule.cooldownDays =
        cooldownUpdatesByCode[rule.code] ??
        cooldownFixesByCode[rule.code] ??
        rule.cooldownDays ??
        null;
      this.em.persist(rule);
    }

    await this.em.flush();
  }

  private async validateRuleSeedState(): Promise<void> {
    const rules = await this.em.find(WarningRule, {});

    const missingCooldown = rules.filter(
      (rule) => rule.cooldownDays === null || rule.cooldownDays === undefined,
    );
    if (missingCooldown.length > 0) {
      const codes = missingCooldown.map((rule) => rule.code).join(', ');
      throw new Error(
        `Seed validation failed: missing cooldownDays for ${codes}`,
      );
    }

    const emptyHintsForEnabled = rules.filter(
      (rule) =>
        rule.enabled &&
        (!rule.hintTemplate || rule.hintTemplate.trim().length === 0),
    );
    if (emptyHintsForEnabled.length > 0) {
      const codes = emptyHintsForEnabled.map((rule) => rule.code).join(', ');
      throw new Error(
        `Seed validation failed: empty hintTemplate for enabled rules: ${codes}`,
      );
    }

    const duplicatedCodes = rules
      .map((rule) => rule.code)
      .filter((code, index, arr) => arr.indexOf(code) !== index);
    if (duplicatedCodes.length > 0) {
      throw new Error(
        `Seed validation failed: duplicated codes: ${Array.from(new Set(duplicatedCodes)).join(', ')}`,
      );
    }

    const tooLongTitles = rules.filter((rule) => rule.title.length > 120);
    if (tooLongTitles.length > 0) {
      const codes = tooLongTitles.map((rule) => rule.code).join(', ');
      throw new Error(
        `Seed validation failed: title length exceeds DB limit for ${codes}`,
      );
    }
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
          '{dayLabel} {dayPartLabel} temperatura może spaść do {minTempC}°C (próg {thresholdC}°C), co grozi uszkodzeniem młodych liści, zahamowaniem wzrostu i stresem chłodowym u bardziej wrażliwych roślin.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.FROST_RISK_TOMORROW_NIGHT,
        title: 'Jutro w nocy: ryzyko przymrozku',
        message:
          '{dayLabel} {dayPartLabel} temperatura może spaść do {minTempC}°C (próg {thresholdC}°C), co grozi uszkodzeniem młodych liści, zahamowaniem wzrostu i stresem chłodowym u bardziej wrażliwych roślin.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.HARD_FROST_RISK_TODAY_NIGHT,
        title: 'Dziś w nocy: ryzyko silnego mrozu',
        message:
          '{dayLabel} {dayPartLabel} możliwy jest silny mróz do {minTempC}°C (próg {thresholdC}°C), który może prowadzić do poważnego uszkodzenia tkanek, zniszczenia młodych pędów i trwałych strat w uprawie.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
        title: 'Jutro w nocy: ryzyko silnego mrozu',
        message:
          '{dayLabel} {dayPartLabel} możliwy jest silny mróz do {minTempC}°C (próg {thresholdC}°C), który może prowadzić do poważnego uszkodzenia tkanek, zniszczenia młodych pędów i trwałych strat w uprawie.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.HEAVY_RAIN_TODAY_DAY,
        title: 'Dziś w dzień: intensywne opady',
        message:
          '{dayLabel} {dayPartLabel} prognozowana suma opadów to {precipSumMm} mm (próg {thresholdMm} mm), co może prowadzić do zalewania grządki, wypłukiwania składników pokarmowych i pogorszenia napowietrzenia korzeni.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.HEAVY_RAIN_TODAY_NIGHT,
        title: 'Dziś w nocy: intensywne opady',
        message:
          '{dayLabel} {dayPartLabel} prognozowana suma opadów to {precipSumMm} mm (próg {thresholdMm} mm), co może prowadzić do zalewania grządki, wypłukiwania składników pokarmowych i pogorszenia napowietrzenia korzeni.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.HEAVY_RAIN_TOMORROW_DAY,
        title: 'Jutro w dzień: intensywne opady',
        message:
          '{dayLabel} {dayPartLabel} prognozowana suma opadów to {precipSumMm} mm (próg {thresholdMm} mm), co może prowadzić do zalewania grządki, wypłukiwania składników pokarmowych i pogorszenia napowietrzenia korzeni.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
        title: 'Jutro w nocy: intensywne opady',
        message:
          '{dayLabel} {dayPartLabel} prognozowana suma opadów to {precipSumMm} mm (próg {thresholdMm} mm), co może prowadzić do zalewania grządki, wypłukiwania składników pokarmowych i pogorszenia napowietrzenia korzeni.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.WIND_DAMAGE_TODAY_DAY,
        title: 'Dziś w dzień: ryzyko szkód od wiatru',
        message:
          '{dayLabel} {dayPartLabel} wiatr może osiągać {windMaxKmh} km/h (próg {thresholdKmh} km/h), co zwiększa ryzyko łamania pędów, przewracania wyższych roślin i uszkodzeń podpór lub osłon.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.WIND_DAMAGE_TODAY_NIGHT,
        title: 'Dziś w nocy: ryzyko szkód od wiatru',
        message:
          '{dayLabel} {dayPartLabel} wiatr może osiągać {windMaxKmh} km/h (próg {thresholdKmh} km/h), co zwiększa ryzyko łamania pędów, przewracania wyższych roślin i uszkodzeń podpór lub osłon.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.WIND_DAMAGE_TOMORROW_DAY,
        title: 'Jutro w dzień: ryzyko szkód od wiatru',
        message:
          '{dayLabel} {dayPartLabel} wiatr może osiągać {windMaxKmh} km/h (próg {thresholdKmh} km/h), co zwiększa ryzyko łamania pędów, przewracania wyższych roślin i uszkodzeń podpór lub osłon.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.WIND_DAMAGE_TOMORROW_NIGHT,
        title: 'Jutro w nocy: ryzyko szkód od wiatru',
        message:
          '{dayLabel} {dayPartLabel} wiatr może osiągać {windMaxKmh} km/h (próg {thresholdKmh} km/h), co zwiększa ryzyko łamania pędów, przewracania wyższych roślin i uszkodzeń podpór lub osłon.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.WATERING_NEEDED_TODAY,
        title: 'Dziś: podlewanie operacyjne',
        message:
          '{dayLabel} niskie opady ({precipSumMm} mm) i warunki sprzyjające parowaniu zwiększają ryzyko przesuszenia strefy korzeniowej, więc rośliny mogą mieć trudność z pobieraniem wody i składników pokarmowych.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.WATERING_NEEDED_TOMORROW,
        title: 'Jutro: podlewanie operacyjne',
        message:
          '{dayLabel} niskie opady ({precipSumMm} mm) i warunki sprzyjające parowaniu zwiększają ryzyko przesuszenia strefy korzeniowej, więc rośliny mogą mieć trudność z pobieraniem wody i składników pokarmowych.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.SOWING_PAUSE_TOO_COLD_TODAY,
        title: 'Dziś: wstrzymaj siew (za zimno)',
        message:
          '{dayLabel} dla {vegetableName} na {bedName} jest za zimno na bezpieczny siew, więc nasiona mogą kiełkować bardzo wolno, nierówno albo zacząć gnić w chłodnej glebie.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.SOWING_PAUSE_TOO_COLD_TOMORROW,
        title: 'Jutro: wstrzymaj siew (za zimno)',
        message:
          '{dayLabel} dla {vegetableName} na {bedName} jest za zimno na bezpieczny siew, więc nasiona mogą kiełkować bardzo wolno, nierówno albo zacząć gnić w chłodnej glebie.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT,
        title: 'Dziś w nocy: osłoń kiełkujące rośliny',
        message:
          '{dayLabel} {dayPartLabel} {vegetableName} na {bedName} wymaga osłony, ponieważ temperatura może spaść do {minTempC}°C i spowolnić kiełkowanie, uszkodzić liścienie albo osłabić świeżo wzeszłe siewki.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT,
        title: 'Jutro w nocy: osłoń kiełkujące rośliny',
        message:
          '{dayLabel} {dayPartLabel} {vegetableName} na {bedName} wymaga osłony, ponieważ temperatura może spaść do {minTempC}°C i spowolnić kiełkowanie, uszkodzić liścienie albo osłabić świeżo wzeszłe siewki.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.OVERWATERING_PREPARE_TODAY,
        title: 'Dziś: przygotuj drenaż',
        message:
          '{dayLabel} w {bedName} warto przygotować odpływ przed opadami ({precipSumMm} mm), bo nadmiar wody może szybko ograniczyć dostęp tlenu do korzeni i pogorszyć warunki wzrostu.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.OVERWATERING_PREPARE_TOMORROW,
        title: 'Jutro: przygotuj drenaż',
        message:
          '{dayLabel} w {bedName} warto przygotować odpływ przed opadami ({precipSumMm} mm), bo nadmiar wody może szybko ograniczyć dostęp tlenu do korzeni i pogorszyć warunki wzrostu.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.OVERWATERING_CHECK_TODAY,
        title: 'Dziś: sprawdź zastoiska wody',
        message:
          '{dayLabel} po opadach skontroluj {bedName}, bo zastoiska wody i długo mokra gleba zwiększają ryzyko niedotlenienia korzeni, zahamowania wzrostu i problemów chorobowych.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.OVERWATERING_CHECK_TOMORROW,
        title: 'Jutro: sprawdź zastoiska wody',
        message:
          '{dayLabel} po opadach skontroluj {bedName}, bo zastoiska wody i długo mokra gleba zwiększają ryzyko niedotlenienia korzeni, zahamowania wzrostu i problemów chorobowych.',
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
        message:
          '{dayLabel} {dayPartLabel} pod osłoną temperatura może spaść do {minTempC}°C, co nadal grozi uszkodzeniem roślin ciepłolubnych, młodych przyrostów i świeżo posadzonych sadzonek.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GREENHOUSE_FROST_RISK_TOMORROW_NIGHT,
        title: 'Szklarnia/tunel: jutro w nocy ryzyko przymrozku',
        message:
          '{dayLabel} {dayPartLabel} pod osłoną temperatura może spaść do {minTempC}°C, co nadal grozi uszkodzeniem roślin ciepłolubnych, młodych przyrostów i świeżo posadzonych sadzonek.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT,
        title: 'Szklarnia/tunel: dziś w nocy ryzyko silnego mrozu',
        message:
          '{dayLabel} {dayPartLabel} pod osłoną możliwy jest silny mróz do {minTempC}°C, który może przekroczyć możliwości samej konstrukcji i doprowadzić do ciężkich uszkodzeń roślin.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT,
        title: 'Szklarnia/tunel: jutro w nocy ryzyko silnego mrozu',
        message:
          '{dayLabel} {dayPartLabel} pod osłoną możliwy jest silny mróz do {minTempC}°C, który może przekroczyć możliwości samej konstrukcji i doprowadzić do ciężkich uszkodzeń roślin.',
        dayPart: WarningRuleDayPart.NIGHT,
      },
      {
        code: WarningCode.GREENHOUSE_HEAT_WAVE_TODAY_DAY,
        title: 'Szklarnia/tunel: dziś w dzień ryzyko przegrzania',
        message:
          '{dayLabel} {dayPartLabel} temperatura w obiekcie może wzrosnąć do {maxTempC}°C, co grozi stresem cieplnym, więdnięciem, zrzucaniem kwiatów i problemami z zapylaniem.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_HEAT_WAVE_TOMORROW_DAY,
        title: 'Szklarnia/tunel: jutro w dzień ryzyko przegrzania',
        message:
          '{dayLabel} {dayPartLabel} temperatura w obiekcie może wzrosnąć do {maxTempC}°C, co grozi stresem cieplnym, więdnięciem, zrzucaniem kwiatów i problemami z zapylaniem.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY,
        title: 'Szklarnia/tunel: dziś w dzień silny wiatr',
        message:
          '{dayLabel} {dayPartLabel} wiatr może osiągać {windMaxKmh} km/h, co zwiększa ryzyko uszkodzenia folii, drzwi, wietrzników i lekkich elementów konstrukcji.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY,
        title: 'Szklarnia/tunel: jutro w dzień silny wiatr',
        message:
          '{dayLabel} {dayPartLabel} wiatr może osiągać {windMaxKmh} km/h, co zwiększa ryzyko uszkodzenia folii, drzwi, wietrzników i lekkich elementów konstrukcji.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_STORM_TODAY_DAY,
        title: 'Szklarnia/tunel: dziś w dzień ryzyko burzy',
        message:
          '{dayLabel} {dayPartLabel} istnieje ryzyko burzowych porywów i gwałtownych opadów, które mogą uszkodzić konstrukcję, rozszczelnić osłony i pogorszyć warunki dla roślin przy ścianach oraz wejściach.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_STORM_TOMORROW_DAY,
        title: 'Szklarnia/tunel: jutro w dzień ryzyko burzy',
        message:
          '{dayLabel} {dayPartLabel} istnieje ryzyko burzowych porywów i gwałtownych opadów, które mogą uszkodzić konstrukcję, rozszczelnić osłony i pogorszyć warunki dla roślin przy ścianach oraz wejściach.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY,
        title: 'Szklarnia/tunel: dziś w dzień intensywny deszcz',
        message:
          '{dayLabel} {dayPartLabel} prognozowany opad {precipSumMm} mm może powodować podmakanie otoczenia obiektu, przeciążenie odwodnienia i zawilgocenie stref przy wejściach lub bokach konstrukcji.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY,
        title: 'Szklarnia/tunel: jutro w dzień intensywny deszcz',
        message:
          '{dayLabel} {dayPartLabel} prognozowany opad {precipSumMm} mm może powodować podmakanie otoczenia obiektu, przeciążenie odwodnienia i zawilgocenie stref przy wejściach lub bokach konstrukcji.',
        dayPart: WarningRuleDayPart.DAY,
      },
      {
        code: WarningCode.GREENHOUSE_SNOW_LOAD_TODAY,
        title: 'Szklarnia/tunel: dziś ryzyko obciążenia śniegiem',
        message:
          '{dayLabel} śnieg może obciążyć konstrukcję ({snowSumMm} mm), co zwiększa ryzyko odkształceń, osłabienia łączeń i uszkodzenia stelaża lub poszycia.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_SNOW_LOAD_TOMORROW,
        title: 'Szklarnia/tunel: jutro ryzyko obciążenia śniegiem',
        message:
          '{dayLabel} śnieg może obciążyć konstrukcję ({snowSumMm} mm), co zwiększa ryzyko odkształceń, osłabienia łączeń i uszkodzenia stelaża lub poszycia.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_WET_SNOW_TODAY,
        title: 'Szklarnia/tunel: dziś ryzyko mokrego śniegu',
        message:
          '{dayLabel} mokry śnieg ({wetSnowMm} mm) zwiększa ryzyko uszkodzeń, bo szybko narasta na poszyciu i znacznie mocniej obciąża konstrukcję niż suchy śnieg.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_WET_SNOW_TOMORROW,
        title: 'Szklarnia/tunel: jutro ryzyko mokrego śniegu',
        message:
          '{dayLabel} mokry śnieg ({wetSnowMm} mm) zwiększa ryzyko uszkodzeń, bo szybko narasta na poszyciu i znacznie mocniej obciąża konstrukcję niż suchy śnieg.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TODAY,
        title: 'Szklarnia/tunel: dziś nagły spadek temperatury',
        message:
          '{dayLabel} możliwy jest nagły spadek temperatury o {tempDropC}°C, co może wywołać szok termiczny, pogorszyć kondycję roślin i zwiększyć ryzyko uszkodzeń u gatunków wrażliwych.',
        dayPart: WarningRuleDayPart.ANY,
      },
      {
        code: WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW,
        title: 'Szklarnia/tunel: jutro nagły spadek temperatury',
        message:
          '{dayLabel} możliwy jest nagły spadek temperatury o {tempDropC}°C, co może wywołać szok termiczny, pogorszyć kondycję roślin i zwiększyć ryzyko uszkodzeń u gatunków wrażliwych.',
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
