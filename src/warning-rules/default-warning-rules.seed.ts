import { EntityManager } from '@mikro-orm/postgresql';
import {
  WarningCode,
  WarningRuleCategory,
  WarningRuleDayPart,
  WarningRuleHorizon,
  WarningSeverity,
} from '../common/enums/warning.enums';
import { WarningRule } from './warning-rule.entity';

type WarningRuleSeedInput = {
  code: string;
  title: string;
  messageTemplate: string;
  category: string;
  horizon: string;
  dayPart: string;
  generatesTask: boolean;
  severity: string;
  hintTemplate?: string;
  blocking: boolean;
  cooldownDays: number;
  isActive: boolean;
};

export const DEFAULT_WARNING_RULES: WarningRuleSeedInput[] = [
  {
    code: 'HEAVY_RAIN',
    title: 'Prognozowane są intensywne opady deszczu',
    messageTemplate:
      'Prognoza wskazuje na intensywne opady, które mogą silnie nawodnić glebę na grządce {bedName}. Nadmiar wody może wypłukiwać składniki pokarmowe, ograniczać dostęp powietrza do korzeni i pogarszać strukturę podłoża. W takich warunkach rośliny mogą czasowo słabiej rosnąć, a gleba po opadach może się zaskorupiać lub zbijać.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Po ustąpieniu opadów sprawdź, czy na grządce nie stoją zastoiska wody i czy powierzchnia gleby nie uległa zaskorupieniu. Na cięższych glebach warto później delikatnie rozluźnić wierzchnią warstwę, aby przywrócić lepszy dostęp tlenu do strefy korzeniowej.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'STORM_RISK',
    title: 'Nadchodzi burza, która może uszkodzić uprawę',
    messageTemplate:
      'Prognoza wskazuje na burzowy przebieg pogody. Silne podmuchy wiatru, gwałtowne opady i nagłe zmiany warunków mogą uszkodzić rośliny rosnące na grządce {bedName}, zwłaszcza młode egzemplarze, rośliny wysokie oraz gatunki prowadzone przy podporach.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto sprawdzić mocowanie podpór, podwiązać delikatne pędy i usunąć elementy, które mogą zostać przewrócone przez wiatr. Burza często powoduje nie tylko mechaniczne uszkodzenia roślin, ale też rozchlapywanie gleby i wzrost presji chorób po opadach.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'HAIL_RISK',
    title: 'Możliwy grad i mechaniczne uszkodzenia roślin',
    messageTemplate:
      'Prognoza wskazuje na ryzyko gradu. Nawet krótki epizod gradu może uszkodzić liście, pędy, kwiaty i owoce roślin na grządce {bedName}. Uszkodzenia mechaniczne osłabiają rośliny, spowalniają wzrost i zwiększają ryzyko wtórnych infekcji.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'CRITICAL',
    hintTemplate:
      'Jeżeli masz możliwość, zabezpiecz najbardziej wrażliwe uprawy osłoną tymczasową lub przenieś pojemniki w osłonięte miejsce. Po przejściu gradu warto obejrzeć rośliny i usunąć najbardziej zniszczone fragmenty, aby ograniczyć ryzyko dalszych problemów zdrowotnych.',
    blocking: false,
    cooldownDays: 0,
    isActive: true,
  },
  {
    code: 'STRONG_WIND',
    title: 'Silny wiatr może uszkodzić rośliny',
    messageTemplate:
      'Prognoza wskazuje na silny wiatr, który może działać obciążająco na rośliny rosnące na grządce {bedName}. Podmuchy mogą łamać delikatne pędy, przewracać wyższe egzemplarze, osłabiać młode nasadzenia i zwiększać tempo utraty wody przez liście.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Sprawdź stabilność podpór, podwiązań oraz osłon. Wysokie rośliny i młode rozsady są najbardziej narażone na uszkodzenia, zwłaszcza jeśli wcześniej gleba była silnie nawodniona i korzenie słabiej stabilizują roślinę.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'FROST_RISK',
    title: 'Możliwy przymrozek w najbliższej nocy',
    messageTemplate:
      'Prognoza wskazuje na temperaturę bliską lub nieco poniżej zera. Taki przymrozek może uszkodzić delikatne tkanki roślin, szczególnie u gatunków wrażliwych na chłód, takich jak {vegetableName}. Nawet krótkotrwały spadek temperatury może zahamować wzrost i pogorszyć kondycję uprawy.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'NIGHT',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto przygotować osłonę z agrowłókniny albo inne tymczasowe zabezpieczenie najbardziej wrażliwych roślin. Przy przymrozkach największe znaczenie ma ochrona nocna i poranna obserwacja stanu liści oraz młodych pędów.',
    blocking: false,
    cooldownDays: 0,
    isActive: true,
  },
  {
    code: 'HARD_FROST_RISK',
    title: 'Prognozowany silny mróz z wysokim ryzykiem strat',
    messageTemplate:
      'Prognoza wskazuje na wyraźny spadek temperatury poniżej zera. Takie warunki mogą prowadzić do poważnych uszkodzeń roślin na grządce {bedName}, w tym do zniszczenia tkanek, uszkodzeń systemu korzeniowego i obumarcia upraw wrażliwych na mróz.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'NIGHT',
    generatesTask: true,
    severity: 'CRITICAL',
    hintTemplate:
      'Jeżeli to możliwe, zabezpiecz rośliny grubszą osłoną, zastosuj dodatkową warstwę ochronną lub przenieś pojemniki do miejsca bardziej osłoniętego. Silny mróz może spowodować szkody nieodwracalne nawet po jednej nocy.',
    blocking: false,
    cooldownDays: 0,
    isActive: true,
  },
  {
    code: 'HEAT_STRESS',
    title: 'Wysoka temperatura może wywołać stres cieplny',
    messageTemplate:
      'Prognoza wskazuje na bardzo wysoką temperaturę w ciągu dnia. W takich warunkach rośliny na grządce {bedName} mogą szybciej tracić wodę, więdnąć w godzinach południowych, wolniej budować plon i gorzej znosić inne obciążenia środowiskowe.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'DAY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto wcześniej sprawdzić wilgotność gleby, rozważyć ściółkowanie i unikać zabiegów, które dodatkowo obciążają rośliny w czasie największego upału. Wysoka temperatura szczególnie silnie wpływa na młode rośliny i gatunki o płytkim systemie korzeniowym.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'SUN_SCORCH_RISK',
    title: 'Silne słońce może powodować przypalenia',
    messageTemplate:
      'Prognoza wskazuje na bardzo intensywne nasłonecznienie. Przy jednoczesnej wysokiej temperaturze i niedoborze wody może wzrosnąć ryzyko przypaleń liści, uszkodzeń delikatnych tkanek oraz pogorszenia jakości plonu na grządce {bedName}.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'DAY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Najbardziej narażone są młode liście, świeżo wysadzone rozsady oraz rośliny po zabiegach, które osłabiły warstwę ochronną tkanek. Warto zadbać o równomierne nawodnienie i ograniczać dodatkowy stres w najgorętszych godzinach dnia.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'DROUGHT_RISK',
    title: 'Dłuższy brak opadów zwiększa ryzyko suszy',
    messageTemplate:
      'Prognoza wskazuje na przedłużający się okres bez opadów. Gleba na grządce {bedName} może stopniowo tracić wilgoć, co utrudnia roślinom pobieranie składników pokarmowych, osłabia wzrost i zwiększa podatność na stres cieplny.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Regularnie sprawdzaj wilgotność gleby głębiej niż tylko przy samej powierzchni. Głębsze, rzadsze podlewanie i ściółkowanie zwykle daje lepszy efekt niż bardzo częste, płytkie zraszanie.',
    blocking: false,
    cooldownDays: 3,
    isActive: true,
  },
  {
    code: 'WATERING_NEEDED',
    title: 'Warunki wskazują, że podlewanie może być potrzebne',
    messageTemplate:
      'Warunki pogodowe sprzyjają szybkiemu przesychaniu gleby na grządce {bedName}. Jeżeli podłoże jest suche również poniżej powierzchni, rośliny mogą wejść w stan niedoboru wody, co pogarsza wzrost, kwitnienie i zawiązywanie plonu.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'INFO',
    hintTemplate:
      'Przed podlaniem warto sprawdzić realną wilgotność gleby, ponieważ powierzchnia może wysychać szybciej niż warstwa korzeniowa. Najlepiej podlewać w sposób, który nawodni glebę głębiej, a nie tylko chwilowo zwilży samą powierzchnię.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'OVERWATERING_PREPARE',
    title: 'Warto przygotować się na nadmiar wody',
    messageTemplate:
      'Prognoza wskazuje na warunki, które mogą prowadzić do nadmiernego uwilgotnienia gleby na grządce {bedName}. Przy zbyt dużej ilości wody korzenie mają ograniczony dostęp do tlenu, a rośliny mogą zacząć gorzej rosnąć i wykazywać oznaki osłabienia.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'INFO',
    hintTemplate:
      'Jeżeli masz możliwość, sprawdź drożność odpływu wody oraz miejsca, w których wcześniej tworzyły się zastoiska. Zapobieganie problemowi zwykle jest łatwiejsze niż późniejsza regeneracja przelanej gleby.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'OVERWATERING_CHECK',
    title: 'Po opadach warto sprawdzić, czy gleba nie jest przelana',
    messageTemplate:
      'Po ostatnich warunkach pogodowych na grządce {bedName} może utrzymywać się nadmierna wilgoć. Jeżeli gleba pozostaje długo mokra i ciężka, korzenie roślin mogą pracować mniej efektywnie, a wzrasta też ryzyko problemów zdrowotnych.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Sprawdź, czy woda nie zalega w zagłębieniach oraz czy gleba nie jest stale lepka i pozbawiona przewiewności. W razie potrzeby popraw delikatnie strukturę powierzchni i unikaj kolejnego podlewania, dopóki strefa korzeniowa nie odzyska lepszych warunków powietrznych.',
    blocking: false,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'SOWING_PAUSE_TOO_COLD',
    title: 'Warunki są zbyt chłodne na bezpieczny siew',
    messageTemplate:
      'Aktualne warunki pogodowe wskazują, że rozpoczęcie siewu może być zbyt ryzykowne dla rośliny {vegetableName}. Zbyt niska temperatura spowalnia lub zaburza kiełkowanie, zwiększa ryzyko gnicia nasion i może prowadzić do bardzo nierównych wschodów.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Jeżeli siew nie jest pilny, bezpieczniej jest poczekać na stabilniejsze warunki niż rozpoczynać uprawę w zbyt zimnej glebie i powietrzu. Opóźnienie o kilka dni często daje lepszy efekt niż ryzykowny start w niekorzystnej pogodzie.',
    blocking: true,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'GERMINATION_PROTECT_TOO_COLD',
    title: 'Wschody mogą być zagrożone przez chłód',
    messageTemplate:
      'Warunki pogodowe mogą utrudniać bezpieczne wschody rośliny {vegetableName}. Jeżeli nasiona już są w glebie, zbyt niska temperatura może spowalniać kiełkowanie, osłabiać siewki i zwiększać ryzyko strat na początku uprawy.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'NIGHT',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto rozważyć lekką osłonę, która ograniczy wychładzanie gleby i młodych siewek. Na etapie kiełkowania nawet niewielka poprawa warunków może mocno wpłynąć na tempo i wyrównanie wschodów.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'TRANSPLANT_DELAY_TOO_COLD',
    title: 'To może nie być dobry moment na wysadzanie rozsady',
    messageTemplate:
      'Warunki pogodowe wskazują, że wysadzanie rozsady rośliny {vegetableName} może być obecnie ryzykowne. Zbyt niska temperatura spowalnia ukorzenianie, zwiększa stres po przesadzeniu i może prowadzić do zahamowania wzrostu już na starcie.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Jeżeli możesz, poczekaj na bardziej stabilne warunki lub przygotuj osłony po wysadzeniu. Rozsada, która wystartuje w cieplejszym i bardziej przewidywalnym okresie, zwykle szybciej się przyjmuje i lepiej buduje plon.',
    blocking: true,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'MULCH_RECOMMENDED_HOT_WEATHER',
    title: 'W upale ściółkowanie może poprawić warunki uprawy',
    messageTemplate:
      'Obecne warunki pogodowe sprzyjają szybkiemu nagrzewaniu i przesychaniu gleby na grządce {bedName}. W takich okresach ściółka może ograniczyć parowanie, ustabilizować temperaturę podłoża i poprawić warunki dla systemu korzeniowego.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'INFO',
    hintTemplate:
      'Ściółkowanie nie zastępuje podlewania, ale może wyraźnie spowolnić utratę wody i ograniczyć skrajne wahania temperatury przy powierzchni gleby. Jest szczególnie przydatne przy warzywach o płytkim systemie korzeniowym.',
    blocking: false,
    cooldownDays: 7,
    isActive: true,
  },
  {
    code: 'DISEASE_HUMIDITY_RISK_OUTDOOR',
    title: 'Wilgoć i pogoda mogą sprzyjać rozwojowi chorób',
    messageTemplate:
      'Układ pogody sprzyja długiemu utrzymywaniu się wilgoci na roślinach rosnących na grządce {bedName}. Taki mikroklimat zwiększa ryzyko rozwoju chorób, zwłaszcza wtedy, gdy liście długo pozostają mokre po opadach, rosie lub nocnym ochłodzeniu.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Po okresie wilgotnej pogody warto częściej oglądać liście, szczególnie ich dolną stronę oraz gęściej rosnące partie roślin. Wczesne zauważenie pierwszych objawów zwykle daje znacznie większą szansę na ograniczenie strat.',
    blocking: false,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'LATE_BLIGHT_WEATHER_RISK',
    title: 'Pogoda sprzyja warunkom dla zarazy',
    messageTemplate:
      'Prognozowane warunki pogodowe mogą sprzyjać rozwojowi chorób związanych z długotrwałą wilgocią i umiarkowaną temperaturą. W takich okresach uprawy na grządce {bedName} wymagają uważniejszej obserwacji, szczególnie jeśli rosną tam gatunki podatne na silne infekcje liści i łodyg.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Zadbaj o przewiewność roślin, unikaj niepotrzebnego moczenia liści i częściej sprawdzaj pierwsze oznaki zmian chorobowych. Przy wysokim ryzyku najważniejsze jest szybkie wychwycenie problemu, zanim rozprzestrzeni się na większą część uprawy.',
    blocking: false,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'DOWNY_MILDEW_WEATHER_RISK',
    title: 'Warunki sprzyjają chorobom związanym z wilgocią',
    messageTemplate:
      'Prognoza wskazuje na układ pogody, w którym wysoka wilgotność i słabsze przesychanie roślin mogą sprzyjać rozwojowi chorób liści. Jeżeli uprawa na grządce {bedName} jest podatna na takie problemy, ryzyko infekcji może być wyraźnie podwyższone.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Największe ryzyko zwykle pojawia się wtedy, gdy wilgoć utrzymuje się przez wiele godzin z rzędu. Warto częściej obserwować liście i usuwać fragmenty, które wykazują podejrzane zmiany, zanim problem rozprzestrzeni się dalej.',
    blocking: false,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'POWDERY_MILDEW_WEATHER_RISK',
    title: 'Pogoda może zwiększać ryzyko mączniaka',
    messageTemplate:
      'Obecny układ temperatury i wilgotności może sprzyjać chorobom liści o szybkim rozwoju na powierzchni tkanek. Rośliny na grządce {bedName}, szczególnie gęsto rosnące i słabiej przewiewne, mogą być bardziej narażone na rozwój objawów chorobowych.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Warto poprawić przewiewność łanu lub rozkład liści oraz regularnie oglądać rośliny od najstarszych partii. Choroby rozwijające się na powierzchni liści często można łatwiej opanować, jeśli zostaną zauważone bardzo wcześnie.',
    blocking: false,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'SLUG_ACTIVITY_HIGH',
    title: 'Wilgotna pogoda może zwiększać aktywność ślimaków',
    messageTemplate:
      'Obecne warunki pogodowe sprzyjają aktywności ślimaków. Przy wysokiej wilgotności i łagodnej temperaturze mogą one intensywniej żerować na młodych liściach, siewkach i delikatnych częściach roślin rosnących na grządce {bedName}.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'NIGHT',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Szczególnie warto skontrolować młode nasadzenia oraz miejsca osłonięte, wilgotne i zacienione. Przy zwiększonej aktywności ślimaków szybka reakcja zwykle daje znacznie lepszy efekt niż czekanie na widoczne większe szkody.',
    blocking: false,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'APHID_PRESSURE_WEATHER',
    title: 'Pogoda może sprzyjać zwiększonej presji mszyc',
    messageTemplate:
      'Aktualne warunki pogodowe mogą wspierać szybki rozwój kolonii mszyc. Jeżeli na grządce {bedName} rosną młode i intensywnie przyrastające rośliny, ryzyko pojawienia się liczniejszych kolonii oraz osłabienia tkanek może być wyższe niż zwykle.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto częściej sprawdzać młode pędy, wierzchołki wzrostu i spodnią stronę liści. Im wcześniej zauważysz pierwsze skupiska mszyc, tym łatwiej będzie ograniczyć ich liczebność bez silnej interwencji.',
    blocking: false,
    cooldownDays: 3,
    isActive: true,
  },
  {
    code: 'CATERPILLAR_ACTIVITY_RISK',
    title: 'Warunki sprzyjają aktywności gąsienic',
    messageTemplate:
      'Aktualna pogoda może sprzyjać zwiększonej aktywności gąsienic żerujących na liściach. W takich okresach uszkodzenia roślin na grządce {bedName} mogą pojawiać się szybciej, zwłaszcza jeśli uprawa jest już w fazie bujnego ulistnienia.',
    category: 'WEATHER_OUTDOOR',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto regularnie oglądać liście pod kątem wygryzień, odchodów oraz obecności larw. Wczesne usunięcie pojedynczych gąsienic zwykle ogranicza późniejsze większe straty w ulistnieniu.',
    blocking: false,
    cooldownDays: 3,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_HEAT_STRESS',
    title: 'W szklarni rośnie ryzyko stresu cieplnego',
    messageTemplate:
      'Prognoza wskazuje na warunki, które mogą powodować bardzo silne nagrzewanie wnętrza szklarni. Rośliny uprawiane pod osłoną mogą szybciej więdnąć, ograniczać wzrost, gorzej zawiązywać kwiaty i doświadczać silniejszego stresu niż rośliny uprawiane na otwartej przestrzeni.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'RADAR',
    dayPart: 'DAY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'W warunkach szklarniowych liczy się szybka reakcja: przewietrzanie, ograniczanie przegrzewania i utrzymanie stabilniejszej wilgotności podłoża. Nawet kilka godzin bardzo wysokiej temperatury może pogorszyć kondycję roślin i jakość plonu.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_VENTILATION_REQUIRED',
    title: 'W szklarni warto zwiększyć przewietrzanie',
    messageTemplate:
      'Warunki pogodowe wskazują, że wewnątrz szklarni może szybko wzrosnąć temperatura i wilgotność. Przy niewystarczającym przewietrzaniu rośliny są bardziej narażone na stres, kondensację wilgoci oraz rozwój problemów zdrowotnych.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'DAY',
    generatesTask: true,
    severity: 'INFO',
    hintTemplate:
      'Warto wcześniej zadbać o cyrkulację powietrza, aby ograniczyć przegrzewanie oraz utrzymywanie się zawilgocenia na liściach. Dobra wentylacja jest jednym z najważniejszych narzędzi profilaktyki w uprawie pod osłonami.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_SHADE_REQUIRED',
    title: 'W szklarni może być potrzebne czasowe cieniowanie',
    messageTemplate:
      'Prognoza wskazuje na bardzo silne nasłonecznienie, które może prowadzić do przegrzewania szklarni i przeciążenia roślin intensywnym światłem. W takich warunkach liście i delikatne tkanki mogą szybciej tracić wodę oraz ulegać uszkodzeniom.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'DAY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Jeżeli dysponujesz możliwością czasowego cieniowania, warto rozważyć je szczególnie w najgorętszych godzinach dnia. Ograniczenie skrajnego nagrzania zwykle poprawia stabilność wzrostu i zmniejsza ryzyko uszkodzeń fizjologicznych.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_NIGHT_FROST_PROTECTION',
    title: 'Szklarnia może wymagać ochrony przed nocnym chłodem',
    messageTemplate:
      'Prognoza wskazuje na nocne warunki, które mogą obniżyć temperaturę w szklarni do poziomu niebezpiecznego dla roślin wrażliwych. Sama osłona nie zawsze wystarcza, aby utrzymać bezpieczny mikroklimat przy wyraźnym ochłodzeniu.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'RADAR',
    dayPart: 'NIGHT',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto przygotować dodatkową osłonę wewnętrzną, ograniczyć przewiew nocą lub zabezpieczyć najbardziej wrażliwe rośliny. W szklarni wahania temperatury mogą być mniejsze niż na zewnątrz, ale przy chłodnej nocy nadal bywają niebezpieczne.',
    blocking: false,
    cooldownDays: 0,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_HARD_FROST_PROTECTION',
    title: 'Silny mróz może zagrozić uprawie pod osłoną',
    messageTemplate:
      'Prognoza wskazuje na silny mróz, który może obniżyć temperaturę w szklarni do poziomu groźnego nawet dla osłoniętej uprawy. Rośliny wrażliwe na zimno mogą doznać poważnych uszkodzeń, jeżeli nie zostaną odpowiednio zabezpieczone.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'RADAR',
    dayPart: 'NIGHT',
    generatesTask: true,
    severity: 'CRITICAL',
    hintTemplate:
      'Przy takiej prognozie warto zastosować dodatkowe warstwy ochronne, ograniczyć straty ciepła i zabezpieczyć szczególnie wrażliwe partie uprawy. Silny mróz bywa groźny również pod osłonami, zwłaszcza gdy utrzymuje się przez wiele godzin.',
    blocking: false,
    cooldownDays: 0,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_STRONG_WIND_SECURE',
    title: 'Silny wiatr może zagrozić konstrukcji i uprawie pod osłoną',
    messageTemplate:
      'Prognoza wskazuje na silny wiatr, który może obciążać konstrukcję szklarni, osłony, drzwi oraz elementy wentylacyjne. Oprócz ryzyka uszkodzeń samej konstrukcji może to pośrednio zagrozić roślinom znajdującym się wewnątrz.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto sprawdzić zamknięcia, mocowanie elementów osłonowych oraz stan folii lub szyb. Dobrze zabezpieczona konstrukcja ogranicza ryzyko nagłego wychłodzenia, uszkodzeń mechanicznych i wtórnego stresu dla roślin.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_HEAVY_RAIN_CHECK_DRAINAGE',
    title: 'Po opadach sprawdź odprowadzanie wody przy szklarni',
    messageTemplate:
      'Prognoza wskazuje na intensywne opady, które mogą powodować nadmiar wody wokół szklarni oraz pogorszenie warunków w strefie korzeniowej. Jeżeli odpływ wody jest niewystarczający, wilgoć może utrzymywać się dłużej, niż jest to bezpieczne dla uprawy.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'RADAR',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto zwrócić uwagę nie tylko na wnętrze szklarni, ale także na otoczenie konstrukcji, rynny i miejsca odpływu. Problemy z wodą przy szklarni bardzo często zaczynają się od niewielkich zaniedbań w odprowadzaniu opadów.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_HIGH_HUMIDITY_RISK',
    title: 'W szklarni rośnie ryzyko nadmiernej wilgotności',
    messageTemplate:
      'Warunki pogodowe i mikroklimat szklarni sprzyjają wzrostowi wilgotności powietrza. Wysoka wilgotność może pogarszać kondycję liści, zwiększać ryzyko chorób oraz utrudniać utrzymanie stabilnych warunków uprawy pod osłoną.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto zwiększyć przewietrzanie, ograniczyć przelewanie roślin i zwrócić uwagę na to, czy para wodna lub skropliny utrzymują się przez długi czas na liściach i elementach konstrukcyjnych. To właśnie długo utrzymująca się wilgoć najczęściej otwiera drogę do dalszych problemów zdrowotnych.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_CONDENSATION_RISK',
    title: 'Na roślinach może utrzymywać się kondensacja wody',
    messageTemplate:
      'Warunki w szklarni mogą powodować skraplanie się wilgoci i długie utrzymywanie kropli na liściach. Taki stan wydłuża czas zwilżenia tkanek i zwiększa ryzyko problemów chorobowych oraz osłabienia roślin.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'NIGHT',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'W szklarni szczególnie ważna jest równowaga między temperaturą, przewietrzaniem i podlewaniem. Ograniczenie nocnej kondensacji zwykle daje wyraźny efekt profilaktyczny nawet bez dodatkowych zabiegów chemicznych czy interwencyjnych.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_DISEASE_PRESSURE',
    title: 'Mikroklimat szklarni zwiększa presję chorób',
    messageTemplate:
      'Układ temperatury i wilgotności w szklarni może sprzyjać rozwojowi chorób, szczególnie gdy rośliny rosną gęsto, liście długo pozostają mokre, a powietrze słabo krąży. Przy takim mikroklimacie nawet niewielkie ogniska problemu mogą rozprzestrzeniać się szybciej niż w uprawie outdoorowej.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto częściej oglądać liście, łodygi i miejsca bardziej zacienione. W szklarni szybka reakcja na pierwsze objawy zwykle ma jeszcze większe znaczenie niż w uprawie polowej, ponieważ warunki do rozwoju infekcji bywają tam stabilniejsze.',
    blocking: false,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_WHITEFLY_RISK',
    title: 'Mikroklimat szklarni może sprzyjać mączlikom',
    messageTemplate:
      'Warunki panujące w szklarni mogą sprzyjać szybkiemu rozwojowi populacji mączlików. Przy ciepłej i stabilnej temperaturze szkodniki te mogą rozmnażać się szybciej i osłabiać rośliny przez długotrwałe żerowanie na liściach.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto regularnie kontrolować spodnią stronę liści i zwracać uwagę na drobne białe owady unoszące się po poruszeniu roślin. W szklarni wczesna reakcja na pierwsze osobniki jest znacznie skuteczniejsza niż walka z rozwiniętą populacją.',
    blocking: false,
    cooldownDays: 3,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_SPIDER_MITE_RISK',
    title: 'W szklarni może wzrosnąć ryzyko przędziorków',
    messageTemplate:
      'Ciepły i suchszy mikroklimat szklarni może sprzyjać rozwojowi przędziorków. Szkodniki te żerują na liściach, osłabiają rośliny i przy większej liczebności mogą szybko pogorszyć kondycję całej uprawy pod osłoną.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'DAY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Zwróć uwagę na drobne odbarwienia liści, delikatne pajęczynki i ogólne osłabienie blaszki liściowej. W szklarni przędziorki potrafią rozwijać się bardzo szybko, szczególnie gdy wilgotność jest zbyt niska, a temperatura wysoka.',
    blocking: false,
    cooldownDays: 3,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_THRIPS_RISK',
    title: 'Warunki pod osłoną mogą sprzyjać wciornastkom',
    messageTemplate:
      'Obecny mikroklimat szklarni może sprzyjać rozwojowi wciornastków. Przy stabilnym cieple i ograniczonej cyrkulacji powietrza szkodniki te mogą szybciej zasiedlać uprawę i powodować uszkodzenia liści, kwiatów oraz młodych zawiązków.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto regularnie oglądać kwiaty, młode liście i miejsca aktywnego wzrostu. Wciornastki są małe i łatwe do przeoczenia, dlatego profilaktyczna obserwacja jest w szklarni szczególnie ważna.',
    blocking: false,
    cooldownDays: 3,
    isActive: true,
  },
  {
    code: 'GREENHOUSE_WATERING_REDUCE_CLOUDY',
    title:
      'W szklarni warto ograniczyć podlewanie przy chłodnej i wilgotnej pogodzie',
    messageTemplate:
      'Przy obecnej pogodzie zużycie wody przez rośliny w szklarni może być mniejsze niż zwykle. Jeżeli podlewanie nie zostanie dostosowane do chłodniejszych i bardziej wilgotnych warunków, wzrasta ryzyko nadmiernego uwilgotnienia strefy korzeniowej.',
    category: 'WEATHER_GREENHOUSE',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'INFO',
    hintTemplate:
      'Warto dostosowywać podlewanie do rzeczywistego tempa pobierania wody, a nie tylko do stałego harmonogramu. W szklarni to właśnie połączenie nadmiaru wilgoci i słabszego przewietrzania często prowadzi do nawracających problemów zdrowotnych.',
    blocking: false,
    cooldownDays: 1,
    isActive: true,
  },
  {
    code: 'SOIL_PH_TOO_LOW',
    title: 'pH gleby jest zbyt niskie dla tej rośliny',
    messageTemplate:
      'Na grządce {bedName} zmierzone pH wynosi {measuredPh}, podczas gdy {vegetableName} najlepiej rośnie w zakresie {recommendedPhMin}–{recommendedPhMax}. Zbyt kwaśny odczyn może ograniczać pobieranie części składników pokarmowych, osłabiać wzrost i pogarszać ogólną stabilność uprawy.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto rozważyć stopniową korektę odczynu, zamiast wykonywać gwałtowną zmianę jednorazowo. Po pewnym czasie dobrze jest ponownie zmierzyć pH i ocenić, czy gleba zbliża się do zakresu korzystniejszego dla tej rośliny.',
    blocking: false,
    cooldownDays: 30,
    isActive: true,
  },
  {
    code: 'SOIL_PH_SLIGHTLY_TOO_LOW',
    title: 'pH gleby jest lekko poniżej zalecanego zakresu',
    messageTemplate:
      'Na grządce {bedName} pH wynosi {measuredPh}, co jest nieco poniżej zakresu optymalnego dla rośliny {vegetableName} ({recommendedPhMin}–{recommendedPhMax}). To odchylenie nie musi od razu powodować problemów, ale może stopniowo wpływać na dostępność składników i kondycję roślin.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'INFO',
    hintTemplate:
      'Lekko nieoptymalny odczyn zwykle warto obserwować i korygować spokojnie, szczególnie gdy rośliny rosną poprawnie. Najważniejsze jest, aby nie doprowadzić do dalszego pogłębiania się odchylenia.',
    blocking: false,
    cooldownDays: 30,
    isActive: true,
  },
  {
    code: 'SOIL_PH_TOO_HIGH',
    title: 'pH gleby jest zbyt wysokie dla tej rośliny',
    messageTemplate:
      'Na grządce {bedName} zmierzone pH wynosi {measuredPh}, czyli przekracza zalecany zakres dla rośliny {vegetableName} ({recommendedPhMin}–{recommendedPhMax}). Zbyt zasadowy odczyn może ograniczać dostępność mikroelementów i prowadzić do objawów niedoborów mimo obecności składników w glebie.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto działać stopniowo i obserwować rośliny, ponieważ korekta zbyt wysokiego pH zwykle wymaga czasu. Przy tym problemie szczególnie często pojawiają się objawy niedoborów żelaza, manganu lub innych mikroelementów.',
    blocking: false,
    cooldownDays: 30,
    isActive: true,
  },
  {
    code: 'SOIL_PH_SLIGHTLY_TOO_HIGH',
    title: 'pH gleby jest lekko powyżej zalecanego zakresu',
    messageTemplate:
      'Na grządce {bedName} pH wynosi {measuredPh}, co jest nieco wyższe niż zakres zalecany dla rośliny {vegetableName} ({recommendedPhMin}–{recommendedPhMax}). To niewielkie odchylenie może jeszcze nie wywoływać silnych objawów, ale warto je obserwować, aby nie pogłębiało się dalej.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'INFO',
    hintTemplate:
      'Jeżeli rośliny wyglądają dobrze, zwykle wystarcza spokojna obserwacja i plan stopniowej poprawy warunków. Warto jednak pilnować, czy nie pojawiają się pierwsze objawy utrudnionego pobierania mikroelementów.',
    blocking: false,
    cooldownDays: 30,
    isActive: true,
  },
  {
    code: 'BED_TOO_SHALLOW',
    title: 'Grządka może być zbyt płytka dla tej rośliny',
    messageTemplate:
      '{vegetableName} wymaga głębokości co najmniej {requiredDepthCm} cm, a grządka {bedName} ma obecnie około {bedDepthCm} cm. Zbyt płytka warstwa uprawna może ograniczać rozwój korzeni, zwiększać wrażliwość na przesuszenie oraz utrudniać roślinie stabilne budowanie plonu.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Jeżeli chcesz prowadzić tę uprawę właśnie tutaj, rozważ zwiększenie głębokości podłoża lub wybór miejsca o lepszych warunkach korzeniowych. Ograniczona głębokość często nie ujawnia się od razu, ale później potrafi silnie hamować wzrost roślin.',
    blocking: true,
    cooldownDays: 60,
    isActive: true,
  },
  {
    code: 'NUTRIENT_DEFICIT_LOW',
    title: 'Wykryto lekki niedobór składnika pokarmowego',
    messageTemplate:
      'Dla rośliny {vegetableName} zapotrzebowanie na składnik {nutrient} zostało ocenione jako {needLevel}, a aktualny poziom wynosi {measuredLevel}. Obecne odchylenie ({deficit}) jest niewielkie, ale może stopniowo wpływać na tempo wzrostu i jakość rozwoju roślin.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'INFO',
    hintTemplate:
      'Przy niewielkich niedoborach zwykle najlepiej sprawdza się spokojna korekta i obserwacja reakcji roślin. Ważne jest, by nie odpowiadać zbyt agresywnie na drobne odchylenie i nie doprowadzić do przenawożenia.',
    blocking: false,
    cooldownDays: 14,
    isActive: true,
  },
  {
    code: 'NUTRIENT_DEFICIT_MEDIUM',
    title: 'Wykryto umiarkowany niedobór składnika pokarmowego',
    messageTemplate:
      'Dla rośliny {vegetableName} zapotrzebowanie na składnik {nutrient} zostało ocenione jako {needLevel}, natomiast aktualny poziom to {measuredLevel}. Obecny niedobór ({deficit}) może już wyraźnie ograniczać wzrost, rozwój liści, korzeni lub plonu, zależnie od funkcji tego składnika.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto dobrać sposób korekty do rodzaju składnika oraz etapu wzrostu roślin. Umiarkowany niedobór zwykle wymaga działania wcześniej niż później, ponieważ rośliny mogą przez dłuższy czas nadrabiać straty rozwojowe.',
    blocking: false,
    cooldownDays: 14,
    isActive: true,
  },
  {
    code: 'NUTRIENT_DEFICIT_HIGH',
    title: 'Wykryto silny niedobór składnika pokarmowego',
    messageTemplate:
      'Dla rośliny {vegetableName} zapotrzebowanie na składnik {nutrient} jest istotnie wyższe niż aktualnie dostępny poziom ({measuredLevel}). Skala niedoboru ({deficit}) może silnie ograniczać wzrost, pogarszać kondycję roślin i bezpośrednio wpływać na wielkość oraz jakość plonu.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'CRITICAL',
    hintTemplate:
      'Przy dużym niedoborze warto działać możliwie szybko, ale nadal z zachowaniem kontroli nad dawką i formą nawożenia. Zbyt gwałtowna odpowiedź też może być problemem, dlatego najlepiej dobierać interwencję do realnej potrzeby roślin i stanu gleby.',
    blocking: false,
    cooldownDays: 10,
    isActive: true,
  },
  {
    code: 'SOIL_TOO_WET',
    title: 'Gleba może być zbyt mokra dla stabilnego wzrostu',
    messageTemplate:
      'Warunki na grządce {bedName} wskazują, że gleba może przez dłuższy czas pozostawać nadmiernie wilgotna. Taki stan ogranicza dostęp powietrza do korzeni, pogarsza pracę strefy korzeniowej i może zwiększać ryzyko problemów zdrowotnych roślin.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto ograniczyć dodatkowe podlewanie i obserwować, czy gleba odzyskuje przewiewność. Jeżeli problem się powtarza, może to oznaczać potrzebę poprawy struktury podłoża lub lepszego odprowadzenia nadmiaru wody.',
    blocking: false,
    cooldownDays: 3,
    isActive: true,
  },
  {
    code: 'SOIL_TOO_DRY',
    title: 'Gleba może być zbyt sucha dla tej uprawy',
    messageTemplate:
      'Warunki na grządce {bedName} wskazują na zbyt niską wilgotność gleby. Jeżeli przesuszenie utrzymuje się dłużej, rośliny mogą słabiej pobierać składniki, wolniej rosnąć i silniej reagować na wysoką temperaturę oraz wiatr.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Warto sprawdzić, czy suchość dotyczy tylko powierzchni, czy również głębszej warstwy korzeniowej. Długotrwale przesuszona gleba zwykle wymaga bardziej przemyślanego nawodnienia niż krótkiego zraszania powierzchni.',
    blocking: false,
    cooldownDays: 2,
    isActive: true,
  },
  {
    code: 'SOIL_COMPACTION_RISK',
    title: 'Zbita gleba może ograniczać rozwój korzeni',
    messageTemplate:
      'Na grządce {bedName} warunki mogą sprzyjać zbijaniu i nadmiernemu zagęszczeniu gleby. Taka struktura utrudnia korzeniom wzrost w głąb, pogarsza cyrkulację powietrza i ogranicza zdolność roślin do stabilnego pobierania wody oraz składników pokarmowych.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'WARNING',
    hintTemplate:
      'Największe ryzyko zbijania pojawia się po intensywnych opadach, przy ciężkich glebach lub częstym ugniataniu grządki. Delikatna poprawa struktury i unikanie pracy na zbyt mokrej glebie zwykle daje najlepszy długofalowy efekt.',
    blocking: false,
    cooldownDays: 14,
    isActive: true,
  },
  {
    code: 'SOIL_STRUCTURE_WEAK',
    title: 'Struktura gleby może nie wspierać tej uprawy',
    messageTemplate:
      'Warunki na grządce {bedName} sugerują, że struktura gleby może być słaba dla stabilnego rozwoju roślin. Jeżeli podłoże jest zbyt ubogie w materię organiczną, zbyt ciężkie albo mało przewiewne, rośliny mogą rosnąć mniej równomiernie i gorzej reagować na nawożenie oraz podlewanie.',
    category: 'SOIL',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'INFO',
    hintTemplate:
      'Jakość struktury gleby poprawia się zwykle stopniowo, poprzez regularne dostarczanie materii organicznej, ograniczanie ugniatania oraz lepsze zarządzanie wodą. To jeden z najważniejszych elementów długoterminowego powodzenia uprawy.',
    blocking: false,
    cooldownDays: 30,
    isActive: true,
  },
  {
    code: 'ROTATION_FAMILY_CONFLICT',
    title: 'Ta sama rodzina roślin wraca na grządkę zbyt szybko',
    messageTemplate:
      'Na grządce {bedName} planujesz posadzić roślinę z rodziny {familyName}. Jeżeli ta sama rodzina była tu uprawiana niedawno, wzrasta ryzyko kumulacji chorób, szkodników oraz jednostronnego wyczerpania gleby.',
    category: 'ROTATION',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'W miarę możliwości warto wydłużać przerwy między uprawami tej samej rodziny botanicznej. Dobrze zaplanowany płodozmian ogranicza liczbę problemów, których później nie da się łatwo naprawić jednym zabiegiem.',
    blocking: false,
    cooldownDays: 30,
    isActive: true,
  },
  {
    code: 'ROTATION_TOO_SOON_AFTER_SAME_FAMILY',
    title: 'Przerwa w płodozmianie może być zbyt krótka',
    messageTemplate:
      'Planowany termin rozpoczęcia uprawy ({plannedStartDate}) może przypadać zbyt wcześnie po wcześniejszej uprawie roślin z rodziny {familyName} na grządce {bedName}. Zbyt krótki odstęp utrudnia regenerację stanowiska i zwiększa ryzyko powtarzających się problemów.',
    category: 'ROTATION',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Jeżeli możesz, przesuń uprawę na inną grządkę albo wybierz gatunek z innej rodziny. Czas między kolejnymi uprawami tej samej grupy roślin ma duże znaczenie dla zdrowotności stanowiska.',
    blocking: false,
    cooldownDays: 30,
    isActive: true,
  },
  {
    code: 'ROTATION_BLOCKING_REQUIRED',
    title: 'Ta uprawa powinna zostać zablokowana przez zasady płodozmianu',
    messageTemplate:
      'Na grządce {bedName} planowana jest uprawa rośliny z rodziny {familyName}, mimo że odstęp od poprzedniej uprawy tej samej rodziny jest zbyt krótki. Ryzyko poważnych problemów zdrowotnych i spadku jakości plonu jest na tyle wysokie, że warto potraktować tę sytuację jako niezalecaną.',
    category: 'ROTATION',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'CRITICAL',
    hintTemplate:
      'W tym przypadku najlepiej zmienić plan uprawy, a nie próbować kompensować ryzyko dodatkowymi zabiegami. Płodozmian jest jednym z tych elementów, które działają najlepiej wtedy, gdy zostaną uwzględnione jeszcze przed sadzeniem.',
    blocking: true,
    cooldownDays: 60,
    isActive: true,
  },
  {
    code: 'HARVEST_NOT_FINISHED',
    title: 'Poprzednia uprawa może jeszcze nie być zakończona',
    messageTemplate:
      'Planowany start nowej uprawy na grządce {bedName} może kolidować z zakończeniem poprzedniego cyklu. Jeżeli przewidywany koniec zbioru przypada na {harvestEndDate}, zbyt wczesne wejście z nową uprawą może utrudnić porządkowanie stanowiska i przygotowanie gleby.',
    category: 'ROTATION',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Przed rozpoczęciem kolejnej uprawy warto uwzględnić czas na uprzątnięcie resztek roślinnych, ocenę stanu gleby i ewentualne prace przygotowawcze. Zbyt ciasny harmonogram często prowadzi do gorszego startu następnej rośliny.',
    blocking: true,
    cooldownDays: 7,
    isActive: true,
  },
  {
    code: 'PLANNED_START_TOO_EARLY',
    title: 'Planowany termin rozpoczęcia uprawy może być zbyt wczesny',
    messageTemplate:
      'Data rozpoczęcia uprawy ({plannedStartDate}) może wypadać zbyt wcześnie względem bezpiecznego terminu dla rośliny {vegetableName}. Zbyt wczesny start zwiększa ryzyko problemów z przyjęciem się roślin, wolniejszego wzrostu i niepotrzebnego stresu na początku sezonu.',
    category: 'ROTATION',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Nawet jeśli kalendarz pozwala rozpocząć prace wcześniej, warto brać pod uwagę realne warunki stanowiska, temperaturę i bezpieczeństwo startu. Wiele upraw lepiej rozwija się po nieco późniejszym, ale stabilniejszym wejściu w sezon.',
    blocking: true,
    cooldownDays: 7,
    isActive: true,
  },
  {
    code: 'SOWING_WINDOW_NOT_STARTED',
    title: 'Okno siewu jeszcze się nie rozpoczęło',
    messageTemplate:
      'Dla rośliny {vegetableName} zalecany termin siewu przypada między {sowingStartMonth} a {sowingEndMonth}. Planowany moment rozpoczęcia może wypadać przed początkiem tego okna, co zwiększa ryzyko słabszych wschodów i mniej stabilnego startu uprawy.',
    category: 'ROTATION',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'INFO',
    hintTemplate:
      'Warto poczekać na początek zalecanego okna siewu, jeżeli nie ma wyraźnego powodu do wcześniejszego działania. Termin siewu bardzo często decyduje o wyrównaniu wschodów i dalszym tempie wzrostu roślin.',
    blocking: true,
    cooldownDays: 7,
    isActive: true,
  },
  {
    code: 'SOWING_WINDOW_CLOSING',
    title: 'Zalecane okno siewu zbliża się do końca',
    messageTemplate:
      'Dla rośliny {vegetableName} zalecany okres siewu trwa od {sowingStartMonth} do {sowingEndMonth} i zbliża się do końca. Jeżeli odkładasz decyzję o siewie, późniejszy termin może dać roślinie mniej korzystny start lub skrócić bezpieczny czas rozwoju.',
    category: 'ROTATION',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: true,
    severity: 'INFO',
    hintTemplate:
      'To nie oznacza jeszcze, że siew jest niemożliwy, ale warto ocenić, czy dalsze odkładanie prac nie zwiększy ryzyka słabszego wyniku uprawy. W wielu przypadkach decyzja podjęta na czas daje wyraźnie stabilniejszy efekt niż siew wykonany na ostatnią chwilę.',
    blocking: false,
    cooldownDays: 7,
    isActive: true,
  },
  {
    code: 'SOWING_WINDOW_ENDED',
    title: 'Zalecane okno siewu już minęło',
    messageTemplate:
      'Dla rośliny {vegetableName} zalecany okres siewu trwał od {sowingStartMonth} do {sowingEndMonth}. Jeżeli planujesz rozpocząć siew dopiero teraz, uprawa może mieć zbyt mało czasu lub mniej korzystne warunki do prawidłowego rozwoju.',
    category: 'ROTATION',
    horizon: 'OPERATIONAL',
    dayPart: 'ANY',
    generatesTask: false,
    severity: 'WARNING',
    hintTemplate:
      'Warto rozważyć wybór innej rośliny, późniejszej odmiany albo zmianę sposobu prowadzenia uprawy. Siew po zakończeniu zalecanego okna nie zawsze musi się nie udać, ale zwykle oznacza wyższe ryzyko i mniejszą przewidywalność efektu.',
    blocking: true,
    cooldownDays: 14,
    isActive: true,
  },
];

export async function upsertDefaultWarningRules(
  em: EntityManager,
): Promise<void> {
  for (const seed of DEFAULT_WARNING_RULES) {
    let rule = await em.findOne(WarningRule, {
      code: seed.code as WarningCode,
    });

    if (!rule) {
      rule = new WarningRule();
      rule.code = seed.code as WarningCode;
    }

    rule.enabled = true;
    rule.code = seed.code as WarningCode;
    rule.title = seed.title;
    rule.messageTemplate = seed.messageTemplate;
    rule.hintTemplate = seed.hintTemplate ?? null;
    rule.severity = seed.severity as WarningSeverity;
    rule.category = seed.category as WarningRuleCategory;
    rule.horizon = seed.horizon as WarningRuleHorizon;
    rule.dayPart = seed.dayPart as WarningRuleDayPart;
    rule.generatesTask = seed.generatesTask;
    rule.blocking = seed.blocking;
    rule.cooldownDays = seed.cooldownDays;
    rule.isActive = seed.isActive;

    em.persist(rule);
  }

  await em.flush();
}
