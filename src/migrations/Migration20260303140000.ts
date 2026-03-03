import { Migration } from '@mikro-orm/migrations';

export class Migration20260303140000 extends Migration {
  up(): void {
    this.addSql(`
      insert into "soils" (
        "name",
        "description",
        "structure",
        "water_retention",
        "drainage",
        "ph_min",
        "ph_max",
        "fertility_level",
        "advantages",
        "disadvantages",
        "improvement_tips"
      )
      values
        (
          'Gleba piaszczysta',
          'Lekka, szybko nagrzewająca się gleba o wysokiej przepuszczalności i niskiej zdolności magazynowania wody.',
          'loose',
          'low',
          'good',
          5.5,
          6.5,
          'low',
          '["Bardzo dobre napowietrzenie korzeni.", "Szybkie nagrzewanie wiosną umożliwia wcześniejsze siewy.", "Niskie ryzyko gnicia korzeni.", "Łatwa w uprawie mechanicznej."]'::jsonb,
          '["Bardzo szybkie przesychanie podczas upałów.", "Wypłukiwanie składników pokarmowych przy intensywnych opadach.", "Wymaga częstego podlewania.", "Niska naturalna żyzność."]'::jsonb,
          '["Regularne dodawanie kompostu i obornika.", "Ściółkowanie w celu ograniczenia parowania.", "Stosowanie nawozów organicznych o wolnym uwalnianiu.", "Dodatek biohumusu lub próchnicy dla poprawy retencji."]'::jsonb
        ),
        (
          'Gleba żwirowa / bardzo przepuszczalna',
          'Ekstremalnie lekka gleba z dużą ilością żwiru i kamieni, minimalnie zatrzymująca wodę.',
          'loose',
          'low',
          'good',
          6.0,
          7.5,
          'low',
          '["Błyskawiczne odprowadzanie nadmiaru wody.", "Bardzo dobre napowietrzenie korzeni.", "Szybko się nagrzewa po zimie."]'::jsonb,
          '["Ekstremalnie szybkie przesychanie.", "Bardzo niska zasobność w składniki.", "Trudniejsze ukorzenianie roślin wymagających wilgoci."]'::jsonb,
          '["Duże ilości kompostu i żyznej ziemi dla zwiększenia retencji.", "Ściółkowanie oraz nawadnianie kropelkowe w sezonie.", "Domieszka gliny lub ziemi próchnicznej w podniesionych grządkach."]'::jsonb
        ),
        (
          'Gleba średnia (gliniasto-piaszczysta)',
          'Najbardziej uniwersalna gleba ogrodowa, zrównoważona pod względem wody i powietrza.',
          'crumbly',
          'medium',
          'medium',
          6.0,
          7.2,
          'medium',
          '["Dobra równowaga wody i powietrza w strefie korzeni.", "Nadaje się do większości warzyw i ziół.", "Stabilna struktura ułatwia wzrost korzeni.", "Umiarkowane ryzyko przesuszenia i przelania."]'::jsonb,
          '["Z czasem może się zagęszczać bez dodatku próchnicy.", "Wymaga okresowego zasilania kompostem lub nawozami.", "Przy intensywnych opadach może tworzyć skorupę, jeśli jest uboga w materię organiczną."]'::jsonb,
          '["Dodawaj kompost 1–2 razy w sezonie dla utrzymania struktury.", "Ściółkuj powierzchnię (słoma, skoszona trawa, liście), aby stabilizować wilgotność.", "Nie pracuj na glebie, gdy jest bardzo mokra (ogranicza to zbijanie)."]'::jsonb
        ),
        (
          'Gleba ciężka (gliniasta)',
          'Ciężka, zbita gleba długo utrzymująca wilgoć, wolno się nagrzewa i łatwo tworzy zastoiska wodne.',
          'compact',
          'high',
          'poor',
          6.5,
          7.5,
          'medium',
          '["Długo utrzymuje wilgoć w okresach bezdeszczowych.", "Dobrze magazynuje składniki odżywcze.", "Może dawać wysokie plony po poprawie struktury."]'::jsonb,
          '["Wysokie ryzyko zastoju wody po opadach.", "Wolne nagrzewanie wiosną opóźnia siewy.", "Trudna w uprawie, gdy jest mokra (kleista) lub przesuszona (twarda).", "Ryzyko gnicia korzeni przy nadmiarze wody."]'::jsonb,
          '["Dodawaj duże ilości kompostu dla poprawy struktury.", "Rozluźniaj glebę materiałami mineralnymi (piasek gruby, drobny żwir) oraz organicznymi.", "Stosuj podniesione grządki i/lub drenaż w newralgicznych miejscach.", "Unikaj ugniatania i chodzenia po glebie po deszczu."]'::jsonb
        ),
        (
          'Gleba pylasta',
          'Drobnoziarnista gleba o umiarkowanej retencji, podatna na zaskorupianie i zbijanie po deszczu.',
          'loose',
          'medium',
          'medium',
          6.0,
          7.0,
          'medium',
          '["Dobra dostępność składników pokarmowych.", "Łatwa do uprawy w umiarkowanej wilgotności.", "Zwykle daje dobre warunki dla kiełkowania, jeśli nie tworzy skorupy."]'::jsonb,
          '["Łatwo tworzy skorupę po intensywnych opadach.", "Podatna na zbijanie i ograniczanie napowietrzenia.", "Może być podatna na erozję wietrzną i wodną na odsłoniętej powierzchni."]'::jsonb,
          '["Ściółkuj, aby ograniczyć zaskorupianie i erozję.", "Dodawaj kompost dla poprawy gruzełkowatej struktury.", "Spulchniaj delikatnie wierzchnią warstwę po ulewach.", "Wprowadzaj rośliny poprawiające strukturę (np. facelia, łubin) w płodozmianie."]'::jsonb
        ),
        (
          'Gleba próchniczna',
          'Żyzna gleba bogata w materię organiczną, o stabilnej, gruzełkowatej strukturze i wysokiej produktywności.',
          'crumbly',
          'high',
          'medium',
          6.0,
          7.2,
          'high',
          '["Wysoka żyzność i dobra dostępność składników.", "Dobra równowaga powietrza i wody w strefie korzeni.", "Lepsza odporność na suszę niż gleby lekkie.", "Stabilna struktura sprzyja rozwojowi mikroorganizmów glebowych."]'::jsonb,
          '["Może wymagać kontroli pH przy intensywnym nawożeniu.", "Przy nadmiernym nawożeniu azotem rośliny mogą nadmiernie „iść w liść”.", "Przy długotrwałych opadach możliwe czasowe przemoczenie w nisko położonych miejscach."]'::jsonb,
          '["Stosuj zrównoważone nawożenie i regularnie uzupełniaj kompost.", "Wykonuj okresowe badania pH i w razie potrzeby koryguj.", "Dbaj o okrywę gleby (ściółka, międzyplony), aby chronić strukturę."]'::jsonb
        ),
        (
          'Gleba torfowa',
          'Organiczna gleba o bardzo wysokiej retencji wody i zwykle kwaśnym odczynie; łatwo się przelewa i długo utrzymuje wilgoć.',
          'loose',
          'high',
          'poor',
          4.0,
          5.5,
          'medium',
          '["Bardzo wysoka zdolność zatrzymywania wody.", "Wysoka zawartość materii organicznej.", "Przydatna w mieszankach do poprawy retencji gleb lekkich."]'::jsonb,
          '["Kwaśny odczyn ogranicza uprawę wielu warzyw bez korekty pH.", "Wysokie ryzyko przelania i zastoju wody.", "Po przesuszeniu może słabo chłonąć wodę (hydrofobowość torfu)."]'::jsonb,
          '["Koryguj pH (wapnowanie) przy uprawie większości warzyw.", "Mieszaj z piaskiem lub gruboziarnistym materiałem dla poprawy drenażu.", "Nawadniaj mniejszymi dawkami, ale częściej, unikając zalewania.", "Dodaj kompost dla poprawy zasobności i stabilizacji struktury."]'::jsonb
        ),
        (
          'Ziemia ogrodowa uniwersalna',
          'Gotowe podłoże ogrodnicze (mieszanka torfu, kompostu i dodatków strukturalnych) do donic oraz podniesionych grządek; z reguły zbilansowane, ale jakość zależy od producenta.',
          'crumbly',
          'medium',
          'medium',
          5.5,
          6.8,
          'high',
          '["Gotowa do użycia bez dodatkowych prac przygotowawczych.", "Dobra dla donic, skrzyń i podniesionych grządek.", "Zwykle ma lepszą żyzność startową niż gleba gruntowa.", "Zbalansowana struktura ułatwia ukorzenianie."]'::jsonb,
          '["Parametry mogą się różnić między producentami i partiami.", "Z czasem w donicach traci strukturę i wymaga uzupełniania.", "Przy złej jakości może zbyt mocno zatrzymywać wodę lub zbyt szybko przesychać."]'::jsonb,
          '["Co sezon uzupełniaj kompostem lub świeżą porcją podłoża.", "Dodaj perlit/keramzyt dla poprawy napowietrzenia i drenażu w donicach.", "Kontroluj wilgotność; w upały podlewaj regularnie, ale bez zalewania.", "Jeśli pH jest zbyt niskie/wysokie, koryguj je odpowiednimi dodatkami."]'::jsonb
        )
      on conflict (lower("name"))
      do update set
        "description" = excluded."description",
        "structure" = excluded."structure",
        "water_retention" = excluded."water_retention",
        "drainage" = excluded."drainage",
        "ph_min" = excluded."ph_min",
        "ph_max" = excluded."ph_max",
        "fertility_level" = excluded."fertility_level",
        "advantages" = excluded."advantages",
        "disadvantages" = excluded."disadvantages",
        "improvement_tips" = excluded."improvement_tips",
        "updated_at" = now();
    `);
  }

  down(): void {}
}
