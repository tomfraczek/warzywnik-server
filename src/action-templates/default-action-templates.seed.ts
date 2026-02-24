import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTemplate } from './action-template.entity';
import {
  ActionTemplateTarget,
  ActionTemplateType,
} from '../common/enums/action.enums';

type ActionTemplateSeedRecord = {
  name: string;
  description: string;
  target: ActionTemplateTarget;
  type: ActionTemplateType;
  defaultDueOffsetDays: number | null;
};

export const DEFAULT_ACTION_TEMPLATES: readonly ActionTemplateSeedRecord[] = [
  {
    name: 'Przygotowanie gleby (spulchnienie)',
    description:
      'Spulchnij wierzchnią warstwę gleby (15–25 cm), usuń chwasty i kamienie. Poprawia napowietrzenie oraz ułatwia rozwój systemu korzeniowego.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: -3,
  },
  {
    name: 'Wymieszanie kompostu z glebą',
    description:
      'Dodaj kompost i dokładnie wymieszaj z glebą na głębokość 15–20 cm, aby poprawić strukturę i zasobność podłoża.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: -2,
  },
  {
    name: 'Wysiew nasion',
    description:
      'Wysiej nasiona zgodnie z zalecaną głębokością i rozstawem. Delikatnie przykryj ziemią i ugnieć podłoże.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.SOWING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Podlewanie po siewie',
    description:
      'Delikatnie podlej miejsce siewu, aby zapewnić odpowiednią wilgotność do kiełkowania.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.WATERING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Przerywka siewek',
    description:
      'Usuń nadmiar siewek, pozostawiając najsilniejsze rośliny w odpowiednim rozstawie.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.THINNING,
    defaultDueOffsetDays: 14,
  },
  {
    name: 'Pikowanie rozsady',
    description:
      'Przenieś młode rośliny do większych pojemników, aby umożliwić rozwój silnego systemu korzeniowego.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.THINNING,
    defaultDueOffsetDays: 10,
  },
  {
    name: 'Hartowanie rozsady',
    description:
      'Stopniowo wystawiaj rozsadę na warunki zewnętrzne przez 7–10 dni przed wysadzeniem do gruntu.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.HARDENING,
    defaultDueOffsetDays: -7,
  },
  {
    name: 'Sadzenie rozsady do gruntu',
    description:
      'Posadź rozsadę w docelowym miejscu, zachowując odpowiedni rozstaw i głębokość sadzenia.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.TRANSPLANTING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Montaż podpór',
    description:
      'Zamontuj podpory lub paliki dla roślin wymagających podwiązywania.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.STAKING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Podlewanie',
    description:
      'Podlej roślinę odpowiednią ilością wody, utrzymując równomierną wilgotność gleby bez jej przelania.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.WATERING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Głębokie podlewanie',
    description:
      'Podlej roślinę obficie, aby woda dotarła do głębszych warstw gleby i wspierała rozwój systemu korzeniowego.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.WATERING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Kontrola wilgotności gleby',
    description:
      'Sprawdź wilgotność gleby ręcznie lub przy pomocy miernika. Unikaj zarówno przesuszenia, jak i przelania.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Regulacja systemu nawadniania',
    description:
      'Dostosuj częstotliwość i ilość podlewania w systemie automatycznym do aktualnych warunków pogodowych.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.IRRIGATION_SETUP,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Ściółkowanie',
    description:
      'Nałóż warstwę ściółki (np. słoma, kora, trawa), aby ograniczyć parowanie wody i rozwój chwastów.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.MULCHING,
    defaultDueOffsetDays: 3,
  },
  {
    name: 'Nawożenie organiczne',
    description:
      'Zastosuj naturalny nawóz (kompost, obornik granulowany, biohumus) w celu poprawy żyzności gleby.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: 14,
  },
  {
    name: 'Nawożenie azotowe',
    description:
      'Zastosuj nawóz bogaty w azot, aby wspomóc wzrost części zielonych roślin.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: 21,
  },
  {
    name: 'Nawożenie potasowe',
    description:
      'Zastosuj nawóz potasowy w celu poprawy kwitnienia, owocowania i odporności roślin.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: 30,
  },
  {
    name: 'Nawożenie fosforowe',
    description:
      'Zastosuj nawóz fosforowy wspierający rozwój systemu korzeniowego i wczesny wzrost roślin.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: 10,
  },
  {
    name: 'Nawożenie dolistne',
    description:
      'Wykonaj nawożenie dolistne, aby szybko uzupełnić niedobory składników odżywczych.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Aplikacja biohumusu',
    description:
      'Zastosuj biohumus w formie podlewania lub oprysku w celu poprawy kondycji roślin.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: 7,
  },
  {
    name: 'Aplikacja kompostu',
    description:
      'Rozłóż kompost na grządce i delikatnie wymieszaj z wierzchnią warstwą gleby.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: -3,
  },
  {
    name: 'Zwalczanie mszyc',
    description:
      'Wykonaj działanie przeciw mszycom (np. oprysk ekologiczny/chemiczny lub spłukanie). Sprawdź rośliny po 2–3 dniach.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.PEST_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Zwalczanie przędziorków',
    description:
      'Zastosuj odpowiedni środek przeciw przędziorkom. Zwróć uwagę na spodnią stronę liści.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.PEST_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Zwalczanie mączlików',
    description:
      'Wykonaj działanie przeciw mączlikom. W razie potrzeby powtórz po kilku dniach.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.PEST_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Oprysk ekologiczny',
    description:
      'Zastosuj naturalny oprysk (np. wyciąg z pokrzywy, czosnku lub mydło potasowe).',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.SPRAYING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Usunięcie ręczne szkodników',
    description:
      'Usuń widoczne szkodniki ręcznie lub spłucz je wodą pod ciśnieniem.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.PEST_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Montaż pułapek lepnych',
    description:
      'Zamontuj żółte pułapki lepne w celu monitorowania i ograniczenia populacji owadów.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.TRAP_SETUP,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Montaż siatek ochronnych',
    description:
      'Zamontuj siatki ochronne w celu zabezpieczenia roślin przed owadami i ptakami.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.PHYSICAL_PROTECTION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Oprysk przeciwgrzybiczy',
    description:
      'Wykonaj oprysk środkiem przeciw chorobom grzybowym zgodnie z zaleceniami producenta.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Oprysk miedziowy',
    description:
      'Zastosuj preparat miedziowy w celu ograniczenia infekcji bakteryjnych i grzybowych.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Oprysk siarkowy',
    description:
      'Wykonaj oprysk preparatem siarkowym przy objawach mączniaka i innych chorób grzybowych.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Usunięcie porażonych liści',
    description:
      'Usuń chore liście i zutylizuj je poza ogrodem, aby ograniczyć rozprzestrzenianie się choroby.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Usunięcie całej rośliny',
    description:
      'Usuń całą roślinę w przypadku silnego porażenia, aby ochronić pozostałe uprawy.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Dezynfekcja narzędzi',
    description:
      'Zdezynfekuj narzędzia ogrodnicze po pracy z porażonymi roślinami, aby ograniczyć przenoszenie patogenów.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_REGENERATION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Odchwaszczanie',
    description:
      'Usuń chwasty ręcznie lub narzędziami, aby ograniczyć konkurencję o wodę i składniki odżywcze.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.WEEDING,
    defaultDueOffsetDays: 7,
  },
  {
    name: 'Przycinanie',
    description:
      'Usuń nadmiar pędów lub liści w celu poprawy cyrkulacji powietrza i jakości plonów.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.PRUNING,
    defaultDueOffsetDays: 21,
  },
  {
    name: 'Usuwanie dolnych liści',
    description:
      'Usuń dolne liście, aby ograniczyć ryzyko chorób i poprawić przewiewność.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.PRUNING,
    defaultDueOffsetDays: 14,
  },
  {
    name: 'Kontrola podpór',
    description:
      'Sprawdź stabilność podpór i w razie potrzeby popraw mocowanie roślin.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: 7,
  },
  {
    name: 'Regulacja rozstawu roślin',
    description:
      'Dostosuj rozstaw roślin, aby zapewnić lepszy dostęp światła i cyrkulację powietrza.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.THINNING,
    defaultDueOffsetDays: 14,
  },
  {
    name: 'Usunięcie resztek roślinnych',
    description:
      'Usuń pozostałości roślin, korzenie i liście z grządki. Ogranicza to rozwój chorób i szkodników w kolejnym sezonie.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_REGENERATION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Przekopanie gleby',
    description:
      'Przekop grządkę na głębokość 20–30 cm w celu napowietrzenia i rozluźnienia gleby po zakończonej uprawie.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: 1,
  },
  {
    name: 'Wapnowanie',
    description:
      'Zastosuj wapno ogrodnicze w celu regulacji pH gleby (jeśli analiza gleby wskazuje potrzebę).',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_REGENERATION,
    defaultDueOffsetDays: 7,
  },
  {
    name: 'Nawożenie regeneracyjne',
    description:
      'Zastosuj kompost lub nawóz regeneracyjny w celu odbudowy zasobności gleby po intensywnej uprawie.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: 3,
  },
  {
    name: 'Wysiew poplonu',
    description:
      'Wysiej rośliny poplonowe (np. gorczyca, facelia) w celu poprawy struktury i żyzności gleby.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_REGENERATION,
    defaultDueOffsetDays: 2,
  },
  {
    name: 'Odkażanie gleby',
    description:
      'Zastosuj zabiegi ograniczające patogeny w glebie (np. preparaty biologiczne lub solarizacja).',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_REGENERATION,
    defaultDueOffsetDays: 5,
  },
  {
    name: 'Test pH gleby',
    description:
      'Wykonaj pomiar pH gleby w celu oceny jej odczynu przed kolejną uprawą.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_TESTING,
    defaultDueOffsetDays: 3,
  },
  {
    name: 'Analiza NPK gleby',
    description:
      'Sprawdź poziom azotu, fosforu i potasu, aby dobrać odpowiednie nawożenie przed kolejnym sezonem.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_TESTING,
    defaultDueOffsetDays: 3,
  },
  {
    name: 'Uzupełnienie kompostu',
    description:
      'Dodaj świeży kompost i wymieszaj z glebą w celu poprawy struktury i zasobności.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: 7,
  },
  {
    name: 'Napowietrzenie gleby',
    description:
      'Spulchnij wierzchnią warstwę gleby bez odwracania struktury, aby poprawić dostęp powietrza.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: 7,
  },
  {
    name: 'Głębokie spulchnienie',
    description:
      'Rozluźnij głębsze warstwy gleby w celu poprawy przepuszczalności i rozwoju korzeni.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: 10,
  },
  {
    name: 'Kontrola struktury gleby',
    description:
      'Oceń strukturę gleby (zbrylenie, przepuszczalność, zawartość próchnicy) przed kolejną uprawą.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: 10,
  },
  {
    name: 'Oznaczenie grządki jako “Ready to use”',
    description:
      'Oznacz grządkę jako przygotowaną do kolejnej uprawy po wykonaniu niezbędnych zabiegów.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.BED_READY,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Regularny przegląd uprawy',
    description:
      'Sprawdź stan liści, łodyg i owoców pod kątem chorób, szkodników i niedoborów składników odżywczych.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: 7,
  },
  {
    name: 'Kontrola wilgotności (monitoring)',
    description:
      'Sprawdź poziom wilgotności gleby i dostosuj podlewanie do aktualnych warunków.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: 3,
  },
  {
    name: 'Kontrola stanu grządki',
    description:
      'Oceń ogólny stan grządki: struktura gleby, obecność chwastów, zastoje wody.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: 14,
  },
  {
    name: 'Ochrona przed przymrozkiem',
    description:
      'Zabezpiecz rośliny agrowłókniną, tunelami lub innymi osłonami przed spodziewanym przymrozkiem.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.PHYSICAL_PROTECTION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Ochrona przed upałem',
    description:
      'Zastosuj cieniowanie, dodatkowe podlewanie lub ściółkowanie w okresach wysokich temperatur.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.PHYSICAL_PROTECTION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Montaż osłon wiatrowych',
    description:
      'Zabezpiecz rośliny przed silnym wiatrem przy pomocy osłon lub podpór.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.PHYSICAL_PROTECTION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Wiosenne przekopanie grządki',
    description:
      'Przekop glebę po zimie w celu jej napowietrzenia i przygotowania do pierwszej uprawy.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Wiosenne nawożenie startowe',
    description:
      'Zastosuj kompost lub nawóz startowy przed pierwszym siewem lub sadzeniem w sezonie.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Test gleby przed sezonem',
    description:
      'Sprawdź pH i zasobność gleby przed rozpoczęciem nowego sezonu upraw.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_TESTING,
    defaultDueOffsetDays: -7,
  },
  {
    name: 'Planowanie płodozmianu',
    description:
      'Zaplanuj kolejną uprawę z uwzględnieniem zasad płodozmianu i unikania monokultury.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.ROTATION_PLANNING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Zmiana rodziny warzyw',
    description:
      'Wybierz kolejną uprawę należącą do innej rodziny botanicznej niż poprzednia.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.ROTATION_PLANNING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Ratunkowe podlewanie',
    description: 'Natychmiastowe podlewanie w przypadku przesuszenia gleby.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.WATERING,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Odsączanie nadmiaru wody',
    description:
      'Popraw drenaż i usuń zastoiny wody w przypadku przelania lub intensywnych opadów.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.IRRIGATION_SETUP,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Awaryjne nawożenie interwencyjne',
    description:
      'Szybkie zastosowanie nawozu w przypadku widocznych objawów niedoboru składników.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Usunięcie silnie porażonej rośliny',
    description:
      'Natychmiastowe usunięcie rośliny w celu ochrony pozostałych upraw.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: 0,
  },
  {
    name: 'Zbiór plonu',
    description: 'Wykonaj zbiór dojrzałych warzyw.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.HARVEST,
    defaultDueOffsetDays: 0,
  },
];

export const upsertDefaultActionTemplates = async (
  em: EntityManager,
): Promise<void> => {
  for (const item of DEFAULT_ACTION_TEMPLATES) {
    const existingExact = await em.findOne(ActionTemplate, {
      name: { $ilike: item.name },
      target: item.target,
      type: item.type,
    });

    if (existingExact) {
      existingExact.description = item.description;
      existingExact.defaultDueOffsetDays = item.defaultDueOffsetDays;
      continue;
    }

    const existingByName = await em.findOne(ActionTemplate, {
      name: { $ilike: item.name },
    });

    if (existingByName) {
      existingByName.target = item.target;
      existingByName.type = item.type;
      existingByName.description = item.description;
      existingByName.defaultDueOffsetDays = item.defaultDueOffsetDays;
      continue;
    }

    const template = new ActionTemplate();
    template.name = item.name;
    template.description = item.description;
    template.target = item.target;
    template.type = item.type;
    template.defaultDueOffsetDays = item.defaultDueOffsetDays;

    em.persist(template);
  }

  await em.flush();
};
