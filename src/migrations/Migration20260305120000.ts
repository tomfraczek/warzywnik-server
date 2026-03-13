import { Migration } from '@mikro-orm/migrations';

export class Migration20260305120000 extends Migration {
  up(): void {
    // Warning copy seeding moved to legit seed services.
    return;

    this.addSql(`
      update "warning_rules" as wr
      set
        "title" = seed."title",
        "message_template" = seed."message_template",
        "hint_template" = seed."hint_template"
      from (
        values
          (
            'FROST_RISK_NEXT_7_DAYS',
            'Ryzyko przymrozku w najbliższych 7 dniach',
            'Prognoza dla {bedName} wskazuje możliwość spadku temperatury do {minTempC}°C (próg {thresholdC}°C) około {riskDate}. Taki spadek może zwiększać ryzyko uszkodzeń tkanek roślin.',
            'Możesz rozważyć czasowe osłony upraw lub zmianę ekspozycji najbardziej wrażliwych roślin.'
          ),
          (
            'HARD_FROST_RISK_NEXT_7_DAYS',
            'Ryzyko silnego mrozu w najbliższych 7 dniach',
            'Prognoza dla {bedName} wskazuje możliwość spadku temperatury do {minTempC}°C (próg {thresholdC}°C) około {riskDate}. Może to powodować istotne uszkodzenia roślin wrażliwych na mróz.',
            'Warto rozważyć dodatkowe warstwy osłon i ograniczenie ekspozycji roślin najbardziej podatnych na mróz.'
          ),
          (
            'DROUGHT_RISK_NEXT_7_DAYS',
            'Ryzyko niedoboru wody w perspektywie 7 dni',
            'Prognozowana suma opadów dla {bedName} wynosi {precipSumMm} mm w 7 dni (próg {thresholdMm} mm). Taki poziom opadów może zwiększać ryzyko przesuszenia podłoża.',
            'Możesz rozważyć korektę harmonogramu nawadniania i działania ograniczające parowanie, np. ściółkowanie.'
          ),
          (
            'HEAVY_RAIN_RISK_NEXT_48H',
            'Ryzyko intensywnych opadów w perspektywie 48 godzin',
            'Prognoza dla {bedName} wskazuje sumę opadów {precipSumMm} mm w 48 godzin (próg {thresholdMm} mm), z możliwym maksimum {peakHourPrecipMm} mm/h. Może to zwiększać ryzyko podtopień i wypłukiwania gleby.',
            'Jeżeli grządka ma ograniczony odpływ, warto rozważyć tymczasowe odprowadzenie wody i dodatkowe zabezpieczenie powierzchni gleby.'
          ),
          (
            'WIND_DAMAGE_RISK_NEXT_48H',
            'Ryzyko uszkodzeń roślin przez wiatr w perspektywie 48 godzin',
            'Prognoza dla {bedName} wskazuje porywy do {windMaxKmh} km/h (próg {thresholdKmh} km/h). Taka prędkość wiatru może zwiększać ryzyko uszkodzeń pędów, osłon i podpór.',
            'Warto rozważyć dodatkową stabilizację elementów konstrukcyjnych oraz ochronę najbardziej podatnych roślin.'
          ),
          (
            'FUNGAL_DISEASE_PRESSURE_HIGH',
            'Podwyższone ryzyko presji chorób grzybowych',
            'Warunki dla {bedName} (opady {precipSumMm} mm i średnia temperatura {avgTempC}°C) mogą sprzyjać rozwojowi chorób grzybowych. Może to zwiększać prawdopodobieństwo infekcji liści i pędów.',
            'Możesz rozważyć poprawę przewiewności łanu i częstszy monitoring objawów chorobowych.'
          ),
          (
            'OVERWATERING_RISK',
            'Ryzyko nadmiernego uwilgotnienia podłoża',
            'Prognozowane opady ({precipSumMm} mm) oraz obecny drenaż ({soilDrainage}) mogą powodować długie utrzymywanie się wilgoci w {bedName}. Taki stan zwiększa ryzyko zastoisk i problemów strefy korzeniowej.',
            'Jeżeli gleba długo pozostaje mokra, warto rozważyć ograniczenie dodatkowego podlewania i poprawę odpływu wody.'
          ),
          (
            'GERMINATION_TOO_COLD',
            'Ryzyko słabego kiełkowania z powodu niskiej temperatury',
            'Prognozowana temperatura minimalna dla {vegetableName} w {bedName} to {forecastMinTempC}°C przy minimum kiełkowania {minGerminationTempC}°C. Taki poziom może obniżać tempo i równomierność wschodów.',
            'Możesz rozważyć przesunięcie terminu siewu lub zastosowanie osłon podnoszących temperaturę przy powierzchni gleby.'
          ),
          (
            'WATERING_NEEDED_TODAY',
            'Dziś: ryzyko niedoboru wody',
            '{dayLabel}: niska suma opadów ({precipSumMm} mm) oraz warunki parowania mogą zwiększać ryzyko deficytu wilgoci dla części upraw.',
            null
          ),
          (
            'WATERING_NEEDED_TOMORROW',
            'Jutro: ryzyko niedoboru wody',
            '{dayLabel}: niska suma opadów ({precipSumMm} mm) oraz warunki parowania mogą zwiększać ryzyko deficytu wilgoci dla części upraw.',
            null
          ),
          (
            'SOWING_PAUSE_TOO_COLD_TODAY',
            'Dziś: ryzyko niepowodzenia siewu (za zimno)',
            '{dayLabel}: temperatura dla {vegetableName} na {bedName} może być zbyt niska dla bezpiecznego i równomiernego rozpoczęcia kiełkowania.',
            null
          ),
          (
            'SOWING_PAUSE_TOO_COLD_TOMORROW',
            'Jutro: ryzyko niepowodzenia siewu (za zimno)',
            '{dayLabel}: temperatura dla {vegetableName} na {bedName} może być zbyt niska dla bezpiecznego i równomiernego rozpoczęcia kiełkowania.',
            null
          ),
          (
            'GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT',
            'Dziś w nocy: ryzyko uszkodzenia siewek przez chłód',
            '{dayLabel} {dayPartLabel}: dla {vegetableName} na {bedName} prognozowana temperatura minimalna {minTempC}°C może zwiększać ryzyko stresu chłodowego młodych roślin.',
            null
          ),
          (
            'GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT',
            'Jutro w nocy: ryzyko uszkodzenia siewek przez chłód',
            '{dayLabel} {dayPartLabel}: dla {vegetableName} na {bedName} prognozowana temperatura minimalna {minTempC}°C może zwiększać ryzyko stresu chłodowego młodych roślin.',
            null
          ),
          (
            'OVERWATERING_PREPARE_TODAY',
            'Dziś: ryzyko podtopienia grządki',
            '{dayLabel}: prognozowane opady ({precipSumMm} mm) w {bedName} mogą zwiększać ryzyko przeciążenia drenażu i miejscowych zastoisk wody.',
            null
          ),
          (
            'OVERWATERING_PREPARE_TOMORROW',
            'Jutro: ryzyko podtopienia grządki',
            '{dayLabel}: prognozowane opady ({precipSumMm} mm) w {bedName} mogą zwiększać ryzyko przeciążenia drenażu i miejscowych zastoisk wody.',
            null
          ),
          (
            'OVERWATERING_CHECK_TODAY',
            'Dziś: ryzyko zastoisk po opadach',
            '{dayLabel}: po opadach w {bedName} może utrzymywać się nadmiar wilgoci, co zwiększa ryzyko lokalnych zastoisk i osłabienia warunków tlenowych w strefie korzeniowej.',
            null
          ),
          (
            'OVERWATERING_CHECK_TOMORROW',
            'Jutro: ryzyko zastoisk po opadach',
            '{dayLabel}: po opadach w {bedName} może utrzymywać się nadmiar wilgoci, co zwiększa ryzyko lokalnych zastoisk i osłabienia warunków tlenowych w strefie korzeniowej.',
            null
          )
      ) as seed("code", "title", "message_template", "hint_template")
      where wr."code"::text = seed."code";
    `);
  }

  down(): void {
    // no-op: this migration normalizes wording to warning-style copy only
  }
}
