import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WarningCode, WarningSeverity } from '../../common/enums/warning.enums';
import { WarningRule } from '../../warning-rules/warning-rule.entity';
import { WeatherWarningConfig } from './weather-warning-config.entity';
import { WeatherWarningConfigService } from './weather-warning-config.service';

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
    const seeds: Array<{
      code: WarningCode;
      title: string;
      messageTemplate: string;
      hintTemplate?: string;
    }> = [
      {
        code: WarningCode.FROST_RISK_NEXT_7_DAYS,
        title: 'Ryzyko przymrozku',
        messageTemplate:
          'W ciągu 7 dni prognozowane minimum to {minTempC}°C (próg {thresholdC}°C).',
        hintTemplate: 'Rozważ osłony roślin przed nocą: {riskDate}.',
      },
      {
        code: WarningCode.HARD_FROST_RISK_NEXT_7_DAYS,
        title: 'Ryzyko silnego mrozu',
        messageTemplate:
          'W ciągu 7 dni możliwy silny mróz: {minTempC}°C (próg {thresholdC}°C).',
      },
      {
        code: WarningCode.DROUGHT_RISK_NEXT_7_DAYS,
        title: 'Ryzyko suszy',
        messageTemplate:
          'Suma opadów 7d to {precipSumMm} mm (próg {thresholdMm} mm).',
      },
      {
        code: WarningCode.HEAVY_RAIN_RISK_NEXT_48H,
        title: 'Ryzyko intensywnych opadów',
        messageTemplate:
          'W 48h prognozowane opady {precipSumMm} mm (próg {thresholdMm} mm, pik {peakHourPrecipMm} mm/h).',
      },
      {
        code: WarningCode.WIND_DAMAGE_RISK_NEXT_48H,
        title: 'Ryzyko szkód od wiatru',
        messageTemplate:
          'Prognozowany maksymalny wiatr: {windMaxKmh} km/h (próg {thresholdKmh} km/h).',
      },
      {
        code: WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH,
        title: 'Wysoka presja chorób grzybowych',
        messageTemplate:
          'Warunki sprzyjają chorobom: opad {precipSumMm} mm, średnia temp. {avgTempC}°C.',
      },
      {
        code: WarningCode.OVERWATERING_RISK,
        title: 'Ryzyko przelania grządki',
        messageTemplate:
          'Grządka {bedName}: opady {precipSumMm} mm i drenaż {soilDrainage}.',
      },
      {
        code: WarningCode.GERMINATION_TOO_COLD,
        title: 'Za zimno na kiełkowanie',
        messageTemplate:
          '{vegetableName} na {bedName}: prognozowane minimum {forecastMinTempC}°C (minimum kiełkowania {minGerminationTempC}°C).',
      },
    ];

    for (const seed of seeds) {
      let rule = await this.em.findOne(WarningRule, { code: seed.code });
      if (!rule) {
        rule = new WarningRule();
        rule.code = seed.code;
        rule.severity = WarningSeverity.WARNING;
        rule.enabled = true;
        rule.isActive = true;
        rule.blocking = false;
      }

      if (!rule.title) rule.title = seed.title;
      if (!rule.messageTemplate) rule.messageTemplate = seed.messageTemplate;
      if (!rule.hintTemplate && seed.hintTemplate) {
        rule.hintTemplate = seed.hintTemplate;
      }

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
          WarningCode.HEAVY_RAIN_RISK_NEXT_48H,
          WarningCode.WIND_DAMAGE_RISK_NEXT_48H,
          WarningCode.FUNGAL_DISEASE_PRESSURE_HIGH,
          WarningCode.OVERWATERING_RISK,
          WarningCode.GERMINATION_TOO_COLD,
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
}
