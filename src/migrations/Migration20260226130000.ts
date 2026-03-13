import { Migration } from '@mikro-orm/migrations';

export class Migration20260226130000 extends Migration {
  up(): void {
    this.addSql(`
      do $$
      declare
        warning_code_enum_type text;
      begin
        select format('%I.%I', c.udt_schema, c.udt_name)
          into warning_code_enum_type
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'warning_rules'
          and c.column_name = 'code'
          and c.data_type = 'USER-DEFINED'
        limit 1;

        if warning_code_enum_type is not null then
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'SOIL_NOT_RECOMMENDED');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'PH_OUT_OF_RANGE');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'DEPTH_TOO_SMALL');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'NPK_TOO_LOW');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'ROTATION_RISK');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'WATER_RETENTION_MISMATCH');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'DRAINAGE_MISMATCH');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'FAMILY_REPETITION');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'HARVEST_WINDOW_MISSED');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'SUBOPTIMAL_SOWING_TIME');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'EXPERIMENTAL_SETUP');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'FROST_RISK_NEXT_7_DAYS');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'HARD_FROST_RISK_NEXT_7_DAYS');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'DROUGHT_RISK_NEXT_7_DAYS');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'HEAVY_RAIN_RISK_NEXT_48H');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'WIND_DAMAGE_RISK_NEXT_48H');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'FUNGAL_DISEASE_PRESSURE_HIGH');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'OVERWATERING_RISK');
          execute format('alter type %s add value if not exists %L', warning_code_enum_type, 'GERMINATION_TOO_COLD');
        end if;
      end
      $$;
    `);

    // Warning data seeding moved to legit seed services.
    return;

    this.addSql(`
      insert into "warning_rules" (
        "code",
        "enabled",
        "severity",
        "title",
        "message_template",
        "hint_template",
        "blocking",
        "cooldown_days",
        "is_active"
      )
      values
        (
          'SOIL_NOT_RECOMMENDED',
          true,
          'WARNING',
          'Warunki glebowe mogą nie być optymalne',
          E'Typ gleby w grządce „{bedName}” może nie odpowiadać wymaganiom warzywa „{vegetableName}”.\n\nChoć uprawa jest możliwa, roślina może rozwijać się wolniej, mieć słabszy system korzeniowy lub dawać niższy plon.',
          E'Rozważ:\n• poprawę struktury gleby poprzez dodanie kompostu, piasku lub materii organicznej,\n• analizę właściwości gleby przed sezonem,\n• wybór rośliny lepiej przystosowanej do aktualnych warunków.\n\nOptymalna gleba znacząco zwiększa odporność rośliny na stres środowiskowy.',
          false,
          null,
          true
        ),
        (
          'DEPTH_TOO_SMALL',
          true,
          'WARNING',
          'System korzeniowy może nie mieć wystarczającej przestrzeni',
          E'Grządka „{bedName}” ma obecnie {bedDepthCm} cm głębokości, natomiast warzywo „{vegetableName}” potrzebuje minimum {requiredDepthCm} cm, aby prawidłowo rozwijać system korzeniowy.\n\nZbyt płytka gleba może ograniczyć wzrost, obniżyć plon oraz zwiększyć podatność rośliny na suszę i stres.',
          E'Możesz:\n• pogłębić grządkę,\n• zastosować podwyższoną rabatę,\n• wybrać odmianę o płytszym systemie korzeniowym.\n\nW przypadku pozostawienia obecnych warunków plon może być mniejszy niż oczekiwany.',
          false,
          null,
          true
        ),
        (
          'PH_OUT_OF_RANGE',
          true,
          'WARNING',
          'pH gleby poza optymalnym zakresem',
          E'Zmierzone pH gleby w grządce „{bedName}” wynosi {measuredPh}. Dla warzywa „{vegetableName}” zalecany zakres to {recommendedPhMin}–{recommendedPhMax}.\n\nNieprawidłowe pH może utrudniać pobieranie składników pokarmowych i osłabiać roślinę.',
          E'Rozważ korektę pH:\n• gdy pH jest zbyt niskie — wapnowanie,\n• gdy pH jest zbyt wysokie — zakwaszanie (np. siarczan amonu/torf kwaśny) zależnie od gleby.\n\nWarto wykonać ponowny pomiar po 2–4 tygodniach i wprowadzać zmiany stopniowo.',
          false,
          null,
          true
        ),
        (
          'NPK_TOO_LOW',
          true,
          'WARNING',
          'Za niski poziom składników pokarmowych',
          E'W grządce „{bedName}” poziom składnika „{nutrient}” jest zbyt niski dla warzywa „{vegetableName}”.\n\nWymagany poziom: {needLevel}\nAktualny poziom: {measuredLevel}\nDeficyt: {deficit}\n\nNiedobory mogą spowolnić wzrost, pogorszyć jakość plonu i zwiększyć podatność na choroby.',
          E'Rozważ:\n• zastosowanie nawozu dopasowanego do deficytu (mineralnego lub organicznego),\n• dodanie kompostu lub obornika (jeśli to odpowiednie dla rośliny),\n• ponowne badanie gleby po nawożeniu.\n\nZbyt gwałtowne nawożenie może zaszkodzić — zwiększaj dawki stopniowo.',
          false,
          null,
          true
        ),
        (
          'ROTATION_RISK',
          true,
          'WARNING',
          'Ryzyko związane ze zmianowaniem',
          E'W grządce „{bedName}” może wystąpić ryzyko płodozmianowe dla warzywa „{vegetableName}”.\n\nSadzenie podobnych roślin w krótkich odstępach czasu może zwiększać presję chorób i szkodników oraz prowadzić do wyjałowienia gleby.',
          E'Zalecenia:\n• zachowaj przerwę w uprawie tej samej grupy roślin (min. 2–4 lata, zależnie od gatunku),\n• stosuj zmianowanie i poplony,\n• rozważ nawożenie regeneracyjne po zbiorach.\n\nJeśli to możliwe, wybierz inną grządkę lub gatunek z innej grupy.',
          false,
          null,
          true
        ),
        (
          'WATER_RETENTION_MISMATCH',
          true,
          'WARNING',
          'Retencja wody może być niedopasowana',
          E'Retencja wody w grządce „{bedName}” może nie odpowiadać wymaganiom warzywa „{vegetableName}”.\n\nNiedopasowanie retencji może prowadzić do przesuszania lub nadmiernego zawilgocenia korzeni.',
          E'Możesz:\n• zwiększyć retencję dodając kompost, materię organiczną lub ściółkę,\n• zmniejszyć retencję poprzez rozluźnienie struktury (np. piasek/perlit) i poprawę odpływu,\n• dostosować częstotliwość podlewania.\n\nObserwuj roślinę i reaguj na pierwsze objawy stresu wodnego.',
          false,
          null,
          true
        ),
        (
          'DRAINAGE_MISMATCH',
          true,
          'WARNING',
          'Drenaż gleby może być niewystarczający',
          E'Drenaż w grządce „{bedName}” może nie być odpowiedni dla warzywa „{vegetableName}”.\n\nSłaby drenaż zwiększa ryzyko gnicia korzeni i chorób grzybowych, a zbyt szybki odpływ może powodować przesuszanie.',
          E'Rozważ:\n• poprawę drenażu (dodanie materiałów rozluźniających, podniesienie grządki),\n• zastosowanie ściółki przy zbyt szybkim przesychaniu,\n• dostosowanie podlewania i struktury gleby.\n\nDobrze działający drenaż stabilizuje warunki wzrostu i ogranicza choroby.',
          false,
          null,
          true
        ),
        (
          'FAMILY_REPETITION',
          true,
          'WARNING',
          'To samo warzywo lub rodzina botaniczna w krótkim odstępie czasu',
          E'W grządce „{bedName}” w krótkim odstępie czasu ponownie pojawia się rodzina botaniczna „{familyName}”.\n\nTo może zwiększać presję chorób, szkodników i prowadzić do pogorszenia kondycji gleby.',
          E'Zalecenia:\n• stosuj płodozmian — sadź rośliny z innej rodziny,\n• wprowadź poplon lub rośliny strukturotwórcze,\n• rozważ przeniesienie uprawy do innej grządki.\n\nRegularna rotacja poprawia zdrowie roślin i stabilizuje plon.',
          false,
          null,
          true
        ),
        (
          'HARVEST_WINDOW_MISSED',
          true,
          'INFO',
          'Okno zbioru mogło zostać przekroczone',
          E'Planowane okno zbioru dla „{vegetableName}” już minęło (do {harvestEndDate}).\n\nJeśli roślina nadal rośnie, jakość plonu może być gorsza lub roślina może wejść w fazę starzenia/kwitnienia.',
          E'Możesz:\n• sprawdzić dojrzałość i zebrać plon możliwie szybko,\n• jeśli plon jest już słabej jakości — usuń roślinę i przygotuj grządkę pod kolejną uprawę,\n• zanotuj obserwacje — pomoże to lepiej planować terminy w przyszłości.',
          false,
          null,
          true
        ),
        (
          'SUBOPTIMAL_SOWING_TIME',
          true,
          'INFO',
          'Termin siewu może nie być optymalny',
          E'Planowany termin siewu dla „{vegetableName}” może być poza zalecanym oknem ({sowingStartMonth}–{sowingEndMonth}).\n\nSiew poza optymalnym okresem może skutkować gorszym kiełkowaniem, wolniejszym wzrostem lub słabszym plonem.',
          E'Rozważ:\n• przesunięcie terminu siewu na zalecane miesiące,\n• rozpoczęcie uprawy z rozsady, jeśli to możliwe,\n• zapewnienie lepszych warunków startowych (osłony, temperatura, wilgotność).\n\nJeśli decydujesz się siać teraz — monitoruj kiełkowanie i reaguj na warunki pogodowe.',
          false,
          null,
          true
        ),
        (
          'EXPERIMENTAL_SETUP',
          true,
          'INFO',
          'To ustawienie ma charakter eksperymentalny',
          E'Konfiguracja uprawy w grządce „{bedName}” dla warzywa „{vegetableName}” jest oznaczona jako eksperymentalna.\n\nMoże to oznaczać, że warunki odbiegają od standardowych zaleceń (np. termin, gleba, retencja, drenaż) i wynik może być trudniejszy do przewidzenia.',
          E'Jeśli chcesz testować:\n• zapisuj obserwacje (tempo wzrostu, problemy, plon),\n• porównuj z uprawą w warunkach standardowych,\n• reaguj szybko na symptomy stresu.\n\nEksperymenty są OK — ale najlepiej prowadzić je świadomie i etapami.',
          false,
          null,
          true
        ),
        (
          'FROST_RISK_NEXT_7_DAYS',
          true,
          'CRITICAL',
          'Ryzyko przymrozku w najbliższych dniach',
          E'W grządce „{bedName}” prognozowany jest przymrozek: minimalna temperatura może spaść do {minTempC}°C (próg {thresholdC}°C) dnia {riskDate}.',
          E'Rozważ zabezpieczenie upraw (agrowłóknina, osłony). Najbardziej ryzykowna jest noc/przedświt.',
          false,
          0,
          true
        ),
        (
          'HARD_FROST_RISK_NEXT_7_DAYS',
          true,
          'CRITICAL',
          'Ryzyko silnego mrozu w najbliższych dniach',
          E'W grządce „{bedName}” prognozowany jest silny mróz: minimalna temperatura może spaść do {minTempC}°C (próg {thresholdC}°C) dnia {riskDate}.',
          E'Zabezpiecz rośliny priorytetowo (dodatkowe okrycie, tunel, przeniesienie wrażliwych roślin).',
          false,
          0,
          true
        ),
        (
          'DROUGHT_RISK_NEXT_7_DAYS',
          true,
          'WARNING',
          'Ryzyko suszy w ciągu 7 dni',
          E'W grządce „{bedName}” prognozowana jest niska suma opadów ({precipSumMm} mm) w najbliższych 7 dniach (próg {thresholdMm} mm).',
          E'Zaplanuj podlewanie, ściółkowanie oraz ogranicz parowanie (np. warstwa ściółki).',
          false,
          1,
          true
        ),
        (
          'HEAVY_RAIN_RISK_NEXT_48H',
          true,
          'WARNING',
          'Ryzyko ulewnych opadów w ciągu 48h',
          E'Prognoza dla „{bedName}” wskazuje na intensywne opady: suma {precipSumMm} mm w 48h (próg {thresholdMm} mm), maks. {peakHourPrecipMm} mm/h.',
          E'Sprawdź odpływ wody, zabezpiecz glebę przed wypłukiwaniem i rozważ osłony dla młodych roślin.',
          false,
          0,
          true
        ),
        (
          'WIND_DAMAGE_RISK_NEXT_48H',
          true,
          'WARNING',
          'Ryzyko uszkodzeń przez wiatr w ciągu 48h',
          E'W okolicy „{bedName}” prognozowany jest silny wiatr: do {windMaxKmh} km/h (próg {thresholdKmh} km/h) w ciągu 48h.',
          E'Zabezpiecz podpory, tunele, agrowłókninę i delikatne rośliny. Największe ryzyko dotyczy wysokich/wiotkich pędów.',
          false,
          0,
          true
        ),
        (
          'FUNGAL_DISEASE_PRESSURE_HIGH',
          true,
          'WARNING',
          'Wysoka presja chorób grzybowych',
          E'Warunki pogodowe sprzyjają chorobom grzybowym w „{bedName}” (opady {precipSumMm} mm, średnia temp. {avgTempC}°C).',
          E'Zwiększ przewiewność (przerzedzenie), unikaj moczenia liści przy podlewaniu, obserwuj objawy. Rozważ działania profilaktyczne odpowiednie dla gatunku.',
          false,
          1,
          true
        ),
        (
          'OVERWATERING_RISK',
          true,
          'WARNING',
          'Ryzyko przelania / zbyt mokrej gleby',
          E'W „{bedName}” prognozowane opady ({precipSumMm} mm) w połączeniu z drenażem „{soilDrainage}” mogą powodować zbyt mokre podłoże.',
          E'Wstrzymaj podlewanie, sprawdź odpływ wody i obserwuj objawy gnicia korzeni. Rozważ poprawę drenażu (jeśli problem nawraca).',
          false,
          1,
          true
        ),
        (
          'GERMINATION_TOO_COLD',
          true,
          'WARNING',
          'Zbyt zimno na kiełkowanie',
          E'Dla „{vegetableName}” w „{bedName}” prognoza wskazuje zbyt niską temperaturę: min. {forecastMinTempC}°C przy wymaganym minimum {minGerminationTempC}°C.',
          E'Rozważ opóźnienie siewu, osłony (tunel/agrowłóknina) lub start z rozsady w cieple.',
          false,
          0,
          true
        )
      on conflict ("code") do nothing;
    `);
  }

  down(): void {
    // no-op: seed is additive and must not overwrite or remove existing data
  }
}
