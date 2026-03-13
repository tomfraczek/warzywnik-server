import { EntityManager } from '@mikro-orm/postgresql';
import { FertilizerType } from './fertilizer-type.entity';
import {
  ApplicationMethod,
  EffectLevel,
  FertilizerCategory,
  FertilizerForm,
  NutrientEffect,
  PhEffect,
  RecommendedFrequency,
  RiskLevel,
  SoilStructureEffect,
} from '../common/enums/fertilizer.enums';

type FertilizerSeedRecord = {
  name: string;
  description: string;
  category: FertilizerCategory;
  form: FertilizerForm;
  applicationMethod: ApplicationMethod;
  riskLevel: RiskLevel;
  nitrogenEffect: NutrientEffect;
  phosphorusEffect: NutrientEffect;
  potassiumEffect: NutrientEffect;
  phEffect: PhEffect;
  soilStructureEffect: SoilStructureEffect;
  waterRetentionEffect: EffectLevel;
  drainageEffect: EffectLevel;
  recommendedFrequency: RecommendedFrequency;
  dosageGuidance: string | null;
  notes: string | null;
  isActive: boolean;
};

// Source: user-provided seed dataset
export const DEFAULT_FERTILIZERS: readonly FertilizerSeedRecord[] = [
  {
    name: 'Kompost',
    description:
      'Kompost jest jednym z najcenniejszych i najbardziej uniwersalnych nawozów organicznych stosowanych w ogrodnictwie, sadownictwie i uprawie warzyw. Powstaje w wyniku kontrolowanego rozkładu materii organicznej przez mikroorganizmy glebowe, grzyby oraz bakterie. Do jego wytwarzania wykorzystuje się resztki roślinne, liście, skoszoną trawę, obierki warzywne i owocowe, drobne gałęzie oraz inne naturalne materiały organiczne. Dobrze przygotowany kompost poprawia żyzność gleby, zwiększa zawartość próchnicy, wspiera rozwój życia biologicznego oraz stabilizuje warunki wodno-powietrzne w podłożu. Działa wolniej niż nawozy mineralne, ale jego efekt jest bardziej trwały i korzystniejszy dla całego ekosystemu gleby. Regularne stosowanie kompostu pomaga odbudować glebę zmęczoną intensywną uprawą, poprawia strukturę zarówno gleb lekkich, jak i ciężkich, a także wspiera długofalowe magazynowanie składników pokarmowych.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.LOW,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.INCREASES,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej stosuje się warstwę około 2-5 cm na powierzchni gleby lub miesza z górną warstwą podłoża przed sezonem.',
    notes:
      'Kompost dobrze sprawdza się jako nawóz bazowy oraz materiał do ściółkowania i poprawy jakości podłoża.',
    isActive: true,
  },
  {
    name: 'Obornik bydlęcy',
    description:
      'Obornik bydlęcy to klasyczny nawóz organiczny o szerokim zastosowaniu w ogrodnictwie i rolnictwie. Powstaje z mieszaniny odchodów bydła oraz materiału ściółkowego, najczęściej słomy. Jest ceniony za stosunkowo łagodne działanie, dobrą zawartość materii organicznej oraz zdolność do poprawy struktury gleby. W porównaniu z bardziej skoncentrowanymi nawozami organicznymi działa spokojniej i długofalowo, dzięki czemu dobrze nadaje się do ogólnego wzbogacania gleby w próchnicę i podstawowe składniki pokarmowe. Obornik bydlęcy poprawia pojemność wodną gleb lekkich, rozluźnia gleby zwięzłe, zwiększa aktywność biologiczną podłoża i wspiera naturalny obieg składników mineralnych. Jest szczególnie wartościowy w uprawach warzyw, które wymagają dobrej struktury gleby i stabilnego uwalniania składników pokarmowych przez dłuższy czas.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.INCREASES,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Zwykle stosuje się około 3-5 kg na metr kwadratowy, najlepiej jesienią przed przekopaniem lub głębszym spulchnieniem gleby.',
    notes:
      'Świeży obornik najlepiej stosować poza okresem bezpośredniego sadzenia lub siewu, aby uniknąć nadmiernego zasolenia i strat azotu.',
    isActive: true,
  },
  {
    name: 'Obornik koński',
    description:
      'Obornik koński jest nawozem organicznym szczególnie cenionym za swoją luźniejszą strukturę, szybszy rozkład oraz zdolność do poprawy napowietrzenia gleby. Zawiera odchody końskie wymieszane z materiałem ściółkowym, zwykle słomą, dzięki czemu bywa bardziej pulchny i cieplejszy w procesie rozkładu niż obornik bydlęcy. Jest chętnie stosowany w ogrodach warzywnych, na zagonach podwyższonych oraz w inspektach i tunelach, gdzie wykorzystuje się także jego właściwości grzewcze podczas fermentacji. Obornik koński dostarcza materii organicznej, poprawia strukturę gleby, zwiększa jej porowatość i wspiera aktywność mikroorganizmów. Dobrze sprawdza się w poprawianiu gleb ciężkich oraz w odbudowie podłoży zubożonych przez wieloletnią uprawę.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.INCREASES,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej stosuje się 3-4 kg na metr kwadratowy, zwykle jesienią lub odpowiednio wcześniej przed sadzeniem.',
    notes:
      'Może być szczególnie przydatny przy zakładaniu ciepłych zagonów oraz poprawie struktury gleby w tunelach i szklarniach.',
    isActive: true,
  },
  {
    name: 'Obornik owczy',
    description:
      'Obornik owczy jest stosunkowo skoncentrowanym nawozem organicznym o wyraźnym działaniu odżywczym i glebotwórczym. Zawiera stosunkowo dużo składników pokarmowych w przeliczeniu na masę, a jednocześnie dostarcza glebie cennej materii organicznej. W praktyce ogrodniczej bywa ceniony tam, gdzie potrzebne jest silniejsze wzbogacenie gleby przy mniejszej objętości materiału. Wspiera tworzenie próchnicy, poprawia strukturę gleby, zwiększa aktywność biologiczną oraz pozytywnie wpływa na zdolność gleby do gromadzenia wody i składników pokarmowych. Dzięki wolniejszemu uwalnianiu substancji odżywczych działa długofalowo i wspiera stabilny rozwój roślin.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.INCREASES,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Zwykle stosuje się około 2-3 kg na metr kwadratowy, najlepiej po wcześniejszym przekompostowaniu lub przefermentowaniu.',
    notes:
      'Ze względu na większą koncentrację składników warto stosować go ostrożniej niż obornik bydlęcy.',
    isActive: true,
  },
  {
    name: 'Obornik kozi',
    description:
      'Obornik kozi to organiczny nawóz naturalny o dobrym potencjale poprawy żyzności gleby i dostarczania podstawowych składników pokarmowych. Jest zbliżony charakterem do innych oborników zwierzęcych, ale często postrzegany jest jako bardziej suchy i skoncentrowany. Wnosi do gleby materię organiczną, poprawia strukturę podłoża, wspiera rozwój mikroorganizmów oraz sprzyja zwiększeniu pojemności sorpcyjnej gleby. Może być używany zarówno do regeneracji gleb ubogich, jak i do wzmacniania ogólnej zasobności stanowiska przed uprawą roślin wymagających żyznego podłoża.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.INCREASES,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej stosuje się około 2-3 kg na metr kwadratowy po wcześniejszym ustabilizowaniu materiału.',
    notes:
      'Najlepiej sprawdza się jako nawóz przedsiewny lub przed sadzeniem, a nie bezpośrednio przy młodych roślinach.',
    isActive: true,
  },
  {
    name: 'Obornik kurzy',
    description:
      'Obornik kurzy należy do najbardziej skoncentrowanych nawozów organicznych pochodzenia zwierzęcego. Zawiera relatywnie dużo azotu, fosforu i potasu, dlatego działa szybciej i intensywniej niż wiele innych oborników. Ze względu na wysoką zawartość składników pokarmowych oraz większe ryzyko zasolenia wymaga ostrożniejszego dawkowania. Jest szczególnie przydatny w sytuacjach, gdy gleba jest wyraźnie uboga, a uprawy potrzebują mocniejszego zasilenia organicznego. Oprócz funkcji nawozowej wnosi również materię organiczną, wspiera rozwój mikroorganizmów i poprawia biologiczną aktywność gleby. Niewłaściwie stosowany może jednak powodować uszkodzenia korzeni lub nadmierny wzrost części zielonych kosztem plonu.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.HIGH,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.MEDIUM,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Stosuje się małe dawki, często około 0.5-1.5 kg na metr kwadratowy po kompostowaniu lub w formie dobrze przefermentowanej.',
    notes:
      'Nie zaleca się stosowania świeżego obornika kurzego bezpośrednio pod wrażliwe rośliny.',
    isActive: true,
  },
  {
    name: 'Obornik króliczy',
    description:
      'Obornik króliczy to wartościowy nawóz organiczny, który łączy stosunkowo dobrą zawartość składników pokarmowych z łagodniejszym działaniem niż bardzo silne nawozy zwierzęce. Dostarcza azotu, fosforu, potasu i materii organicznej, a przy tym wspiera odbudowę próchnicy i poprawę struktury gleby. W ogrodnictwie jest ceniony za korzystny wpływ na aktywność biologiczną podłoża oraz stopniowe uwalnianie składników pokarmowych. Może być stosowany do poprawy jakości stanowisk warzywnych, sadowniczych oraz roślin ozdobnych, zwłaszcza tam, gdzie zależy na zrównoważonym nawożeniu organicznym bez gwałtownego przenawożenia.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej stosuje się umiarkowane dawki po wcześniejszym kompostowaniu lub sezonowaniu materiału.',
    notes:
      'Może być dobrym wyborem w ogrodach ekologicznych i małych gospodarstwach prowadzących samodzielne nawożenie organiczne.',
    isActive: true,
  },
  {
    name: 'Obornik granulowany',
    description:
      'Obornik granulowany jest przetworzoną, ustabilizowaną i wygodną w użyciu formą nawozu organicznego. Powstaje przez suszenie i granulację obornika pochodzenia zwierzęcego, dzięki czemu jest łatwiejszy w przechowywaniu, dawkowaniu i aplikacji niż tradycyjny obornik świeży lub półprzefermentowany. Zachowuje wiele zalet nawożenia organicznego, takich jak dostarczanie materii organicznej, poprawa struktury gleby i stopniowe uwalnianie składników pokarmowych, a jednocześnie pozwala na bardziej kontrolowane dawkowanie. Jest szczególnie przydatny w ogrodach przydomowych, na zagonach podwyższonych, w pojemnikach oraz tam, gdzie użytkownik nie ma dostępu do świeżego obornika.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Dawkowanie zależy od koncentracji produktu, ale zwykle jest niższe niż przy oborniku tradycyjnym i stosowane zgodnie z powierzchnią grządki lub objętością podłoża.',
    notes:
      'W praktyce jest wygodną alternatywą dla tradycyjnych nawozów naturalnych, szczególnie w małych ogrodach.',
    isActive: true,
  },
  {
    name: 'Biohumus',
    description:
      'Biohumus to płynny lub półpłynny nawóz organiczny powstający w wyniku przetwarzania materii organicznej przez dżdżownice kompostowe. Zawiera łatwo dostępne związki organiczne, kwasy humusowe, mikroflorę oraz niewielkie ilości makro- i mikroelementów. Jego działanie nie polega na gwałtownym zasilaniu roślin wysokimi dawkami składników pokarmowych, lecz na wspieraniu biologicznej żyzności gleby i poprawie warunków wzrostu. Biohumus jest często wykorzystywany do podlewania roślin warzywnych, ziół, rozsad i roślin doniczkowych. Poprawia aktywność mikrobiologiczną podłoża, wspiera regenerację systemu korzeniowego oraz pomaga roślinom lepiej wykorzystać zasoby zgromadzone w glebie.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.LOW,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.BIWEEKLY,
    dosageGuidance:
      'Najczęściej stosuje się po rozcieńczeniu z wodą, zgodnie z intensywnością wzrostu roślin i zalecanym stężeniem.',
    notes:
      'Jest szczególnie ceniony w uprawie rozsad oraz roślin w pojemnikach, gdzie liczy się delikatne i regularne wsparcie.',
    isActive: true,
  },
  {
    name: 'Wermikompost',
    description:
      'Wermikompost to stała forma bardzo wartościowego nawozu organicznego wytwarzanego przez dżdżownice z materii organicznej. Charakteryzuje się dużą zawartością stabilnych związków próchnicznych, aktywnością biologiczną oraz dobrą strukturą. Jest wykorzystywany zarówno jako nawóz, jak i materiał poprawiający jakość podłoża. Wermikompost pomaga zwiększać żyzność gleby, poprawia jej strukturę, wspiera rozwój pożytecznych mikroorganizmów i ułatwia roślinom pobieranie składników pokarmowych. Działa łagodnie, ale skutecznie, dlatego dobrze sprawdza się w uprawach warzywnych, rozsadowych i w podłożach do donic oraz skrzyń uprawowych.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.LOW,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.INCREASES,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Może być mieszany z podłożem lub stosowany wokół roślin jako dodatek poprawiający jakość gleby.',
    notes:
      'Jest wartościowym komponentem podłoży do rozsad oraz do intensywnej uprawy w małej objętości gleby.',
    isActive: true,
  },
  {
    name: 'Gnojówka z pokrzywy',
    description:
      'Gnojówka z pokrzywy to tradycyjny płynny nawóz organiczny przygotowywany przez fermentację świeżej pokrzywy w wodzie. Jest szczególnie ceniona za działanie wzmacniające wzrost części zielonych roślin oraz za obecność związków azotowych i innych substancji biologicznie aktywnych. Może działać zarówno nawozowo, jak i wspomagająco na kondycję roślin. W uprawie warzyw stosuje się ją najczęściej w okresie intensywnego wzrostu wegetatywnego, zwłaszcza przy roślinach potrzebujących większego wsparcia azotowego. Gnojówka z pokrzywy może również pośrednio wspierać aktywność biologiczną gleby i pobudzać rośliny do silniejszego wzrostu, jednak nie powinna być nadużywana przy roślinach, które w późniejszej fazie mają zawiązywać kwiaty i owoce.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.BIWEEKLY,
    dosageGuidance:
      'Najczęściej stosuje się po rozcieńczeniu, zwykle w formie podlewania wokół roślin w fazie intensywnego wzrostu.',
    notes:
      'Zbyt częste stosowanie może prowadzić do nadmiernego pobudzania wzrostu liści kosztem kwitnienia i owocowania.',
    isActive: true,
  },
  {
    name: 'Gnojówka z żywokostu',
    description:
      'Gnojówka z żywokostu to płynny nawóz organiczny przygotowywany z fermentowanych liści żywokostu. Jest szczególnie ceniona w uprawie warzyw i owoców za relatywnie korzystny wpływ na gospodarkę potasową roślin. W praktyce bywa wykorzystywana w fazie kwitnienia, zawiązywania i dojrzewania owoców, a także tam, gdzie zależy na poprawie jakości plonu. Oprócz działania odżywczego dostarcza roślinom biologicznie aktywnych związków organicznych. Jest chętnie wykorzystywana w ogrodnictwie ekologicznym jako naturalna alternatywa dla części nawozów mineralnych.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.LOW,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.MEDIUM,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.BIWEEKLY,
    dosageGuidance:
      'Najczęściej stosuje się w rozcieńczeniu jako nawóz podlewowy podczas fazy kwitnienia i owocowania.',
    notes:
      'Szczególnie dobrze sprawdza się przy pomidorach, papryce, dyniowatych i innych roślinach owocujących.',
    isActive: true,
  },
  {
    name: 'Gnojówka z obornika',
    description:
      'Gnojówka z obornika jest płynną formą nawożenia organicznego, przygotowywaną poprzez fermentację lub rozcieńczenie przefermentowanego obornika w wodzie. Charakteryzuje się stosunkowo szybkim działaniem jak na nawóz organiczny, ponieważ część składników pokarmowych znajduje się już w formie rozpuszczonej lub łatwo dostępnej. Może być stosowana do okresowego dokarmiania roślin o dużych wymaganiach pokarmowych, zwłaszcza w czasie intensywnego wzrostu. Jednocześnie zachowuje wiele zalet nawożenia organicznego, takich jak wspieranie życia biologicznego w glebie i łagodniejsze działanie niż silne nawozy syntetyczne.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.MONTHLY,
    dosageGuidance:
      'Stosuje się po odpowiednim rozcieńczeniu, zwykle na wilgotną glebę i z zachowaniem ostrożności przy młodych roślinach.',
    notes:
      'Niewłaściwie przygotowana lub zbyt stężona może uszkadzać korzenie i powodować nadmierne zasolenie strefy korzeniowej.',
    isActive: true,
  },
  {
    name: 'Wyciąg z alg morskich',
    description:
      'Wyciąg z alg morskich to nawóz lub biostymulant pochodzenia naturalnego, ceniony za szerokie spektrum działania fizjologicznego. Zawiera związki organiczne, aminokwasy, naturalne regulatory wzrostu, mikroelementy oraz substancje wspierające odporność roślin na stres środowiskowy. Jego działanie nie polega wyłącznie na dostarczaniu klasycznych makroskładników, ale także na pobudzaniu roślin do lepszego wzrostu, regeneracji i adaptacji do niekorzystnych warunków, takich jak susza, chłód czy przesadzanie. Wyciąg z alg jest wykorzystywany zarówno doglebowo, jak i dolistnie, szczególnie w profesjonalnej uprawie warzyw, sadownictwie i produkcji rozsad.',
    category: FertilizerCategory.BIO_STIMULANT,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.LOW,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.BIWEEKLY,
    dosageGuidance:
      'Zwykle stosuje się w małych stężeniach, dolistnie lub przez podlewanie, w okresach stresu lub intensywnego wzrostu.',
    notes:
      'Bardziej wspiera fizjologię roślin niż klasyczne nawożenie podstawowymi makroskładnikami.',
    isActive: true,
  },
  {
    name: 'Mączka rogowa',
    description:
      'Mączka rogowa to organiczny nawóz naturalny pochodzenia zwierzęcego, uzyskiwany z przetworzonych rogów i innych tkanek keratynowych. Jest ceniona przede wszystkim jako wolno działające źródło azotu. Azot uwalnia się stopniowo w miarę rozkładu przez mikroorganizmy glebowe, co sprawia, że mączka rogowa działa długofalowo i nie wywołuje gwałtownych skoków zasolenia. Jest szczególnie przydatna tam, gdzie potrzebne jest umiarkowane, ale stabilne wsparcie wzrostu części zielonych bez ryzyka szybkiego wypłukania składników. W ogrodach warzywnych dobrze sprawdza się jako nawóz bazowy lub uzupełniający w uprawie roślin o dłuższym okresie wzrostu.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Stosuje się ją przed siewem lub sadzeniem, mieszając z górną warstwą gleby.',
    notes:
      'Działa wolniej niż nawozy mineralne azotowe, ale dzięki temu daje bardziej stabilny efekt.',
    isActive: true,
  },
  {
    name: 'Mączka kostna',
    description:
      'Mączka kostna to nawóz organiczny pochodzenia zwierzęcego, uzyskiwany z rozdrobnionych i odpowiednio przetworzonych kości. Jest ceniona przede wszystkim jako źródło fosforu oraz w pewnym stopniu wapnia. Działa wolniej niż rozpuszczalne nawozy mineralne, ponieważ składniki są uwalniane stopniowo w toku procesów biologicznych zachodzących w glebie. Jest przydatna przy zakładaniu stanowiska, sadzeniu roślin wieloletnich oraz tam, gdzie zależy na wspieraniu rozwoju systemu korzeniowego i ogólnej stabilności wzrostu. Dzięki powolnemu działaniu bywa chętnie stosowana w ogrodach ekologicznych i przy uprawach długoterminowych.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej miesza się ją z glebą przed sadzeniem lub stosuje w strefie korzeniowej roślin wymagających dobrego ukorzenienia.',
    notes:
      'Dobrze sprawdza się jako nawóz pod rośliny wieloletnie i gatunki potrzebujące wsparcia fosforowego.',
    isActive: true,
  },
  {
    name: 'Mączka rybna',
    description:
      'Mączka rybna to organiczny nawóz pochodzenia naturalnego, wytwarzany z przetworzonych resztek rybnych. Zawiera azot, fosfor i wiele związków organicznych, dzięki czemu może działać zarówno jako nawóz odżywczy, jak i materiał wspierający biologiczną aktywność gleby. Jest ceniona za stosunkowo dobrą dostępność składników oraz korzystny wpływ na rozwój roślin w początkowych fazach wzrostu. W praktyce stosuje się ją do wzbogacania gleby przed sezonem lub jako składnik mieszanek nawozowych w uprawie ekologicznej. Ze względu na swoje pochodzenie i zapach wymaga starannego stosowania oraz dobrego przykrycia glebą.',
    category: FertilizerCategory.ORGANIC,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Stosuje się ją w niewielkich lub umiarkowanych dawkach, dobrze mieszając z glebą.',
    notes:
      'Wymaga ostrożności w przechowywaniu i stosowaniu, aby nie przyciągała zwierząt i nie powodowała uciążliwego zapachu.',
    isActive: true,
  },
  {
    name: 'Popiół drzewny',
    description:
      'Popiół drzewny jest tradycyjnym materiałem wykorzystywanym w ogrodnictwie jako źródło potasu, wapnia oraz niektórych mikroelementów. Powstaje ze spalania czystego, nieimpregnowanego drewna. Może być cennym dodatkiem w uprawach wymagających zwiększenia zasobności potasowej oraz tam, gdzie gleba wymaga częściowego odkwaszenia. Ze względu na odczyn zasadowy wpływa na podniesienie pH gleby, dlatego nie powinien być stosowany bezrefleksyjnie na wszystkich stanowiskach. Dobrze sprawdza się na glebach kwaśnych oraz w uprawach roślin wrażliwych na niedobór potasu. Przy nadmiernym użyciu może jednak zaburzać równowagę chemiczną gleby i utrudniać pobieranie niektórych składników.',
    category: FertilizerCategory.PH_ADJUSTER,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.MEDIUM,
    phEffect: PhEffect.RAISES,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się go w niewielkich dawkach powierzchniowo lub lekko miesza z glebą, z uwzględnieniem aktualnego pH stanowiska.',
    notes:
      'Nie należy łączyć go bezpośrednio z nawozami azotowymi o wysokiej lotności ani stosować na gleby zasadowe.',
    isActive: true,
  },
  {
    name: 'Saletra amonowa',
    description:
      'Saletra amonowa to jeden z najbardziej rozpowszechnionych mineralnych nawozów azotowych. Zawiera azot w dwóch formach: amonowej i azotanowej, dzięki czemu część składnika działa szybko, a część bardziej stabilnie. Jest stosowana w celu szybkiego pobudzenia wzrostu roślin, zwłaszcza w fazie silnego rozwoju części zielonych. Sprawdza się tam, gdzie konieczna jest szybka reakcja na niedobór azotu lub potrzeba intensywnego zasilenia roślin wiosną. Niewłaściwie stosowana może jednak prowadzić do przenawożenia, nadmiernego bujnego wzrostu i większej podatności roślin na choroby oraz uszkodzenia fizjologiczne.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.HIGH,
    nitrogenEffect: NutrientEffect.HIGH,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.LOWERS,
    soilStructureEffect: SoilStructureEffect.MAY_WORSEN,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się w małych lub umiarkowanych dawkach pogłównie, najlepiej na wilgotną glebę i w okresie aktywnego wzrostu.',
    notes:
      'Nadmierne użycie może prowadzić do zasolenia, wypłukiwania azotu oraz nadmiernego rozwoju masy liściowej.',
    isActive: true,
  },
  {
    name: 'Saletra wapniowa',
    description:
      'Saletra wapniowa to nawóz mineralny dostarczający roślinom szybko dostępnego azotu azotanowego oraz wapnia. Jest szczególnie ceniona w uprawie warzyw wrażliwych na niedobory wapnia, takich jak pomidory, papryka, sałata czy kapustne. Azot wspiera bieżący wzrost, natomiast wapń stabilizuje ściany komórkowe, poprawia jakość tkanek i ogranicza niektóre zaburzenia fizjologiczne, na przykład suchą zgniliznę wierzchołkową owoców. Nawóz ten jest często stosowany w fertygacji, podlewaniu oraz w intensywnej uprawie pod osłonami. Ze względu na szybkie działanie wymaga precyzyjnego dawkowania.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się w rozpuszczeniu lub powierzchniowo, w zależności od systemu uprawy i fazy wzrostu roślin.',
    notes:
      'Jest szczególnie przydatna w okresie intensywnego wzrostu i zawiązywania owoców.',
    isActive: true,
  },
  {
    name: 'Saletra potasowa',
    description:
      'Saletra potasowa to wysokiej jakości nawóz mineralny dostarczający dwóch ważnych składników: azotu w formie azotanowej oraz potasu. Jest ceniona szczególnie w uprawach warzyw owocujących oraz roślin o wysokich wymaganiach jakościowych, ponieważ wspiera zarówno wzrost, jak i gospodarkę wodną, jędrność tkanek oraz jakość plonu. Azot w formie azotanowej działa szybko, a potas wpływa na gospodarkę wodną roślin, odporność na stres oraz dojrzewanie owoców. Nawóz ten jest chętnie wykorzystywany w fertygacji, nawożeniu precyzyjnym oraz intensywnej produkcji ogrodniczej.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.HIGH,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Najczęściej stosowany jest w roztworze jako nawóz podlewowy lub fertygacyjny w okresie kwitnienia i owocowania.',
    notes:
      'Sprawdza się szczególnie tam, gdzie niepożądane są chlorki obecne w niektórych nawozach potasowych.',
    isActive: true,
  },
  {
    name: 'Mocznik',
    description:
      'Mocznik to bardzo skoncentrowany nawóz mineralny azotowy, zawierający wysoką ilość azotu w formie amidowej. Po zastosowaniu w glebie ulega przemianom mikrobiologicznym, przechodząc do form dostępnych dla roślin. Jest szeroko stosowany do pobudzania wzrostu wegetatywnego, ale wymaga ostrożności, ponieważ przy niewłaściwym użyciu może powodować straty azotu do atmosfery, uszkodzenia roślin lub nadmierne zasolenie. Mocznik stosuje się zarówno doglebowo, jak i dolistnie w niskich stężeniach. W praktyce ogrodniczej jest użyteczny tam, gdzie potrzebne jest silne wsparcie azotowe, ale nie powinien być traktowany jako nawóz uniwersalny na cały sezon.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.HIGH,
    nitrogenEffect: NutrientEffect.HIGH,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.LOWERS,
    soilStructureEffect: SoilStructureEffect.MAY_WORSEN,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Powinien być stosowany w małych i dobrze dobranych dawkach, najlepiej przed spodziewanym deszczem lub z wymieszaniem z glebą.',
    notes:
      'Pozostawiony na powierzchni gleby może tracić część azotu przez ulatnianie.',
    isActive: true,
  },
  {
    name: 'Siarczan amonu',
    description:
      'Siarczan amonu to mineralny nawóz azotowy zawierający azot w formie amonowej oraz siarkę. Jest szczególnie przydatny tam, gdzie oprócz wsparcia azotowego potrzebne jest również uzupełnienie siarki, ważnej dla metabolizmu roślin i syntezy białek. Wpływa zakwaszająco na glebę, dlatego bywa chętnie stosowany na stanowiskach o wyższym pH lub przy uprawach preferujących lekko kwaśne podłoże. Działa wolniej niż czysto azotanowe formy azotu, ale bywa bardziej stabilny w glebie. Wymaga jednak świadomego stosowania, aby nie doprowadzić do nadmiernego zakwaszenia stanowiska.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.LOWERS,
    soilStructureEffect: SoilStructureEffect.MAY_WORSEN,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się go w umiarkowanych dawkach, najlepiej z uwzględnieniem aktualnego pH gleby i potrzeb azotowo-siarkowych roślin.',
    notes:
      'Dobrze sprawdza się przy roślinach o większym zapotrzebowaniu na siarkę oraz na glebach zasadowych.',
    isActive: true,
  },
  {
    name: 'Superfosfat pojedynczy',
    description:
      'Superfosfat pojedynczy to klasyczny nawóz mineralny fosforowy stosowany w celu poprawy rozwoju systemu korzeniowego, wspierania kwitnienia oraz ogólnej kondycji roślin. Fosfor jest składnikiem mało ruchliwym w glebie, dlatego ten nawóz najlepiej działa wtedy, gdy zostanie odpowiednio umieszczony w strefie przyszłych korzeni lub wymieszany z glebą. Superfosfat pojedynczy jest przydatny zwłaszcza przy zakładaniu uprawy, przygotowaniu stanowiska oraz przy roślinach wymagających dobrego startu korzeniowego. W porównaniu z bardziej skoncentrowanymi nawozami działa nieco łagodniej, ale nadal stanowi ważne źródło fosforu w glebie.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.HIGH,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej stosuje się go przed siewem lub sadzeniem, mieszając z glebą w strefie korzeniowej.',
    notes:
      'Największą skuteczność osiąga przy zastosowaniu przedsiewnym lub przedsadzeniowym.',
    isActive: true,
  },
  {
    name: 'Superfosfat potrójny',
    description:
      'Superfosfat potrójny jest bardziej skoncentrowanym nawozem fosforowym niż superfosfat pojedynczy. Zawiera wysoką ilość fosforu, dlatego pozwala na bardziej precyzyjne uzupełnianie tego składnika przy mniejszej ilości materiału. Fosfor wspiera rozwój korzeni, kwitnienie, zawiązywanie organów generatywnych oraz ogólną gospodarkę energetyczną roślin. Ze względu na ograniczoną ruchliwość fosforu w glebie nawóz ten powinien być stosowany w odpowiednim miejscu i czasie, najlepiej przed siewem, sadzeniem lub w strefie korzeniowej. Jest przydatny szczególnie na glebach ubogich w przyswajalny fosfor.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.HIGH,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Stosuje się go w mniejszych dawkach niż superfosfat pojedynczy, zwykle przedsiewnie lub przedsadzeniowo.',
    notes:
      'Ze względu na wysoką koncentrację powinien być dawkowany świadomie i zgodnie z potrzebami roślin oraz analizą gleby.',
    isActive: true,
  },
  {
    name: 'Fosforan amonu',
    description:
      'Fosforan amonu to nawóz mineralny dostarczający zarówno fosforu, jak i azotu. Dzięki temu może wspierać jednocześnie rozwój korzeni i początkowy wzrost części nadziemnych roślin. Jest przydatny w nawożeniu startowym, szczególnie przy siewie i sadzeniu upraw, które potrzebują silnego ukorzenienia oraz dobrego rozpoczęcia sezonu. Połączenie fosforu z azotem sprawia, że nawóz ten jest bardziej uniwersalny niż typowy nawóz jednoskładnikowy, ale nadal wymaga precyzyjnego stosowania. Jest szeroko wykorzystywany w nawożeniu przedsiewnym oraz w nowoczesnych systemach uprawy wymagających dobrze zbilansowanego startu.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.LOW,
    phosphorusEffect: NutrientEffect.HIGH,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.LOWERS,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Stosuje się jako nawóz startowy, najlepiej w strefie przyszłych korzeni lub wymieszany z glebą przed siewem.',
    notes:
      'Jest przydatny szczególnie w początkowych fazach wzrostu roślin o dużym zapotrzebowaniu na fosfor.',
    isActive: true,
  },
  {
    name: 'Fosforyt',
    description:
      'Fosforyt jest naturalnym nawozem fosforowym pochodzenia mineralnego, zawierającym fosfor w mniej rozpuszczalnej formie niż nawozy typu superfosfat. Działa wolniej i najlepiej sprawdza się na glebach kwaśnych lub lekko kwaśnych, gdzie jego przyswajalność jest większa. Jest ceniony w systemach długofalowego poprawiania zasobności gleby w fosfor, a także w rolnictwie ekologicznym i przy nawożeniu organiczno-mineralnym. Fosforyt nie daje szybkiego efektu interwencyjnego, ale może stanowić wartościowe źródło fosforu przy planowaniu długoterminowej poprawy żyzności stanowiska.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najlepiej stosować go przedsiewnie lub przed założeniem uprawy, dobrze mieszając z glebą.',
    notes:
      'Działa wolniej niż rozpuszczalne nawozy fosforowe, dlatego nie jest typowym nawozem szybkiego reagowania.',
    isActive: true,
  },
  {
    name: 'Sól potasowa',
    description:
      'Sól potasowa to popularny nawóz mineralny stosowany do uzupełniania potasu w glebie. Potas odgrywa kluczową rolę w gospodarce wodnej roślin, regulacji aparatów szparkowych, odporności na stres oraz jakości plonu. Nawóz ten bywa szeroko używany ze względu na dostępność i skuteczność, jednak zawiera również chlorki, które mogą być niekorzystne dla części gatunków, zwłaszcza bardziej wrażliwych warzyw i roślin uprawianych pod osłonami. Najlepiej sprawdza się w nawożeniu przedsiewnym lub przedsezonowym, gdy jest czas na częściowe przemieszczenie jonów w glebie.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.HIGH,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.MAY_WORSEN,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej stosowana jest przed sezonem lub przedsiewnie, z wymieszaniem z glebą.',
    notes:
      'Nie jest najlepszym wyborem dla roślin szczególnie wrażliwych na chlorki.',
    isActive: true,
  },
  {
    name: 'Siarczan potasu',
    description:
      'Siarczan potasu to nawóz mineralny potasowy pozbawiony chlorków, dlatego jest szczególnie ceniony w uprawie warzyw, owoców i roślin wrażliwych na zasolenie chlorkowe. Oprócz potasu dostarcza także siarki, która wspiera metabolizm roślin i syntezę związków białkowych. Potas wpływa korzystnie na gospodarkę wodną, jędrność tkanek, jakość plonu, odporność na stres oraz efektywność fotosyntezy. Siarczan potasu jest chętnie stosowany zarówno w uprawie gruntowej, jak i pod osłonami, szczególnie w okresie kwitnienia i owocowania.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.HIGH,
    phEffect: PhEffect.LOWERS,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Może być stosowany przedsiewnie lub pogłównie, zależnie od rodzaju uprawy i potrzeb potasowych.',
    notes:
      'To jeden z najlepszych nawozów potasowych dla roślin wrażliwych na chlorki.',
    isActive: true,
  },
  {
    name: 'Azotan potasu',
    description:
      'Azotan potasu jest nawozem mineralnym łączącym azot azotanowy i potas. Dzięki temu wspiera jednocześnie bieżący wzrost roślin oraz poprawę jakości plonu, gospodarki wodnej i odporności na stres. Jest szczególnie przydatny w uprawie warzyw owocujących, gdzie liczy się równowaga między wzrostem a dojrzewaniem i jakością owoców. Z powodu wysokiej rozpuszczalności jest często stosowany w fertygacji, podlewaniu oraz nowoczesnych systemach nawadniania z nawożeniem. Działa szybko i skutecznie, ale wymaga dobrej kontroli dawek.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.HIGH,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Najczęściej stosowany jest w formie roztworu w okresach zwiększonego zapotrzebowania na potas.',
    notes:
      'Dobrze sprawdza się w intensywnej produkcji pomidorów, papryki, ogórków i truskawek.',
    isActive: true,
  },
  {
    name: 'Siarczan magnezu',
    description:
      'Siarczan magnezu to nawóz mineralny dostarczający magnezu i siarki. Magnez jest centralnym składnikiem chlorofilu, dlatego ma kluczowe znaczenie dla fotosyntezy i prawidłowego wybarwienia liści. Niedobór tego składnika objawia się często chloroza między nerwami liści, szczególnie na starszych organach. Siarczan magnezu jest szeroko stosowany zarówno doglebowo, jak i dolistnie, ponieważ jego składniki są stosunkowo łatwo przyswajalne. Wspiera prawidłowy wzrost roślin, intensywność zieleni, efektywność fotosyntezy i jakość plonu.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.LOWERS,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Może być stosowany jako nawóz doglebowy lub w roztworze do dokarmiania dolistnego.',
    notes:
      'Jest jednym z podstawowych nawozów interwencyjnych przy objawach niedoboru magnezu.',
    isActive: true,
  },
  {
    name: 'Kizeryt',
    description:
      'Kizeryt to mineralny nawóz magnezowo-siarkowy zawierający magnez w formie dobrze przyswajalnej dla roślin. Jest używany przede wszystkim do uzupełniania niedoborów magnezu oraz poprawy zaopatrzenia roślin w siarkę. Działa doglebowo i najlepiej sprawdza się tam, gdzie gleba jest uboga w magnez lub gdzie rośliny wykazują wyraźne objawy jego niedoboru. Wspiera fotosyntezę, intensywny wzrost oraz prawidłowe wybarwienie liści, a także poprawia wykorzystanie innych składników pokarmowych.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.LOWERS,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Zwykle stosuje się go przedsiewnie lub jako korekcyjny nawóz doglebowy.',
    notes: 'Szczególnie przydatny na glebach lekkich i ubogich w magnez.',
    isActive: true,
  },
  {
    name: 'Wapno tlenkowe',
    description:
      'Wapno tlenkowe jest silnie działającym materiałem do odkwaszania gleby, stosowanym głównie tam, gdzie konieczna jest szybka korekta bardzo niskiego pH. Działa znacznie gwałtowniej niż łagodniejsze formy wapnowania, dlatego wymaga dużej ostrożności i odpowiedniego terminu stosowania. Podnosi pH gleby, poprawia warunki chemiczne dla wielu upraw oraz zwiększa dostępność części składników odżywczych. Zbyt intensywne użycie może jednak prowadzić do zaburzeń równowagi glebowej i okresowego pogorszenia warunków dla korzeni oraz życia biologicznego.',
    category: FertilizerCategory.PH_ADJUSTER,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.HIGH,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.RAISES,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się wyłącznie w dawkach dostosowanych do aktualnego pH gleby i rodzaju podłoża, zwykle poza okresem bezpośredniej uprawy.',
    notes:
      'Nie powinno być stosowane bezpośrednio przed siewem lub sadzeniem wrażliwych roślin.',
    isActive: true,
  },
  {
    name: 'Wapno węglanowe',
    description:
      'Wapno węglanowe jest łagodniejszym środkiem do odkwaszania gleby niż wapno tlenkowe. Podnosi pH wolniej, ale bezpieczniej, dlatego dobrze nadaje się do większości gleb ogrodowych i warzywnych. Stosuje się je w celu poprawy odczynu gleby, zwiększenia dostępności niektórych składników pokarmowych oraz stworzenia korzystniejszych warunków dla wzrostu roślin, które źle znoszą nadmierne zakwaszenie. Jest często wybierane do systematycznej korekty pH w ogrodach przydomowych.',
    category: FertilizerCategory.PH_ADJUSTER,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.RAISES,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Dawka zależy od rodzaju gleby i aktualnego odczynu, dlatego najlepiej opierać ją na badaniu pH.',
    notes:
      'To bezpieczniejsza opcja wapnowania w ogrodach warzywnych niż forma tlenkowa.',
    isActive: true,
  },
  {
    name: 'Dolomit',
    description:
      'Dolomit to naturalny materiał wapniowo-magnezowy wykorzystywany do odkwaszania gleby oraz uzupełniania magnezu. Działa łagodniej niż niektóre szybkie formy wapna, ale dodatkowo wnosi do gleby magnez, który jest ważny dla fotosyntezy i kondycji roślin. Jest szczególnie użyteczny na glebach kwaśnych i ubogich w magnez, gdzie pozwala jednocześnie poprawić odczyn i uzupełnić dwa ważne pierwiastki. W praktyce ogrodniczej dolomit jest jednym z popularniejszych materiałów do planowego, spokojnego korygowania warunków glebowych.',
    category: FertilizerCategory.PH_ADJUSTER,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.RAISES,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się go zgodnie z potrzebą odkwaszenia i uzupełnienia magnezu, najlepiej po analizie gleby.',
    notes:
      'Działa wolniej niż wapno tlenkowe, ale jest bezpieczniejszy i bardziej uniwersalny.',
    isActive: true,
  },
  {
    name: 'Wapno magnezowe',
    description:
      'Wapno magnezowe to materiał odkwaszający glebę, który oprócz wapnia dostarcza także magnez. Jest stosowane w celu poprawy pH gleby i jednoczesnego uzupełnienia niedoboru magnezu, szczególnie na glebach kwaśnych i lekkich. Poprawia warunki chemiczne podłoża, wspiera dostępność wielu składników odżywczych i może pośrednio sprzyjać lepszej kondycji roślin. Jest dobrym wyborem tam, gdzie sama korekta pH nie wystarcza i potrzebna jest także poprawa zaopatrzenia w magnez.',
    category: FertilizerCategory.PH_ADJUSTER,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.RAISES,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Dawki dobiera się do poziomu zakwaszenia i zasobności gleby w magnez.',
    notes:
      'Szczególnie przydatne na stanowiskach wykazujących jednocześnie kwaśny odczyn i niedobór magnezu.',
    isActive: true,
  },
  {
    name: 'Kreda nawozowa',
    description:
      'Kreda nawozowa to łagodnie działający materiał wapniowy o wysokiej reaktywności, wykorzystywany do odkwaszania gleby. Dzięki drobnej strukturze działa stosunkowo szybko, ale bez tak agresywnego efektu jak wapno tlenkowe. Jest chętnie stosowana w ogrodach warzywnych i sadach, gdzie potrzebna jest umiarkowana, bezpieczna poprawa odczynu gleby. Poprawa pH może zwiększyć dostępność wybranych składników pokarmowych i stworzyć korzystniejsze warunki do wzrostu wielu roślin użytkowych.',
    category: FertilizerCategory.PH_ADJUSTER,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.RAISES,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Najlepiej stosować zgodnie z wynikiem badania pH i rodzajem gleby, zwykle poza szczytem sezonu uprawowego.',
    notes: 'Jest dobrą opcją do regularnej i łagodnej korekty odczynu gleby.',
    isActive: true,
  },
  {
    name: 'Nawóz NPK uniwersalny',
    description:
      'Nawóz NPK uniwersalny to zbilansowany nawóz mineralny wieloskładnikowy, dostarczający azotu, fosforu i potasu w proporcjach odpowiednich do ogólnego stosowania w wielu typach upraw. Jego zaletą jest prostota użycia oraz możliwość wspierania podstawowych potrzeb pokarmowych roślin bez konieczności osobnego dobierania każdego składnika. Sprawdza się w uprawach warzywnych, ozdobnych i sadowniczych jako rozwiązanie ogólne, szczególnie wtedy, gdy nie ma rozpoznanych skrajnych niedoborów. Mimo uniwersalności nie zastępuje precyzyjnego nawożenia dostosowanego do wyników analizy gleby i fazy rozwojowej roślin.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.MEDIUM,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.MONTHLY,
    dosageGuidance:
      'Najczęściej stosuje się go pogłównie w umiarkowanych dawkach, zależnie od zasobności gleby i wymagań roślin.',
    notes:
      'To praktyczny nawóz ogólnego przeznaczenia, ale nie zawsze idealny dla roślin o specyficznych potrzebach.',
    isActive: true,
  },
  {
    name: 'Nawóz NPK do warzyw',
    description:
      'Nawóz NPK do warzyw to wieloskładnikowy nawóz mineralny przygotowany z myślą o szeroko pojętej uprawie warzyw. W odróżnieniu od uniwersalnych mieszanek jego proporcje są zwykle lepiej dopasowane do tempa wzrostu, budowy plonu oraz potrzeb pokarmowych roślin użytkowych. Może być stosowany zarówno przedsiewnie, jak i pogłównie, zależnie od rodzaju warzywa i etapu uprawy. Zapewnia podstawowe makroskładniki potrzebne do budowy masy zielonej, rozwoju korzeni i tworzenia plonu, ale w intensywnej produkcji nadal może wymagać uzupełniania nawozami specjalistycznymi.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.MEDIUM,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.MONTHLY,
    dosageGuidance:
      'Stosuje się go zgodnie z intensywnością wzrostu warzyw, zwykle w dawkach dzielonych lub jako zasilanie podstawowe i pogłówne.',
    notes:
      'Dobrze sprawdza się jako baza nawożenia przy uprawie mieszanej wielu warzyw.',
    isActive: true,
  },
  {
    name: 'Nawóz NPK do pomidorów',
    description:
      'Nawóz NPK do pomidorów to specjalistyczna mieszanka wieloskładnikowa przeznaczona dla roślin owocujących, zwłaszcza pomidorów. Zwykle charakteryzuje się proporcjami składników wspierającymi jednocześnie wzrost, kwitnienie, zawiązywanie owoców i ich jakość. W praktyce taki nawóz ma pomóc ograniczyć zbyt bujny wzrost liści przy jednoczesnym utrzymaniu dobrej produktywności roślin. W zależności od formulacji może być stosowany zarówno doglebowo, jak i w systemach podlewania. Jest szczególnie użyteczny w uprawie pojemnikowej, szklarniowej i tunelowej, gdzie zapotrzebowanie pokarmowe pomidorów jest duże i zmienne w czasie.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.MEDIUM,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.HIGH,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.BIWEEKLY,
    dosageGuidance:
      'Najczęściej stosuje się go regularnie od fazy silnego wzrostu do okresu owocowania, zgodnie z intensywnością plonowania.',
    notes: 'W praktyce bywa łączony z dodatkowymi źródłami wapnia lub magnezu.',
    isActive: true,
  },
  {
    name: 'Nawóz NPK do roślin liściowych',
    description:
      'Nawóz NPK do roślin liściowych jest opracowany z myślą o gatunkach uprawianych głównie dla części zielonych, takich jak sałaty, zioła, kapusty liściowe czy szpinak. Zwykle wspiera intensywny rozwój liści i równomierny wzrost roślin, z większym naciskiem na zbilansowane zaopatrzenie w azot. W uprawie tych gatunków istotne jest szybkie tempo wzrostu, dobra barwa liści i brak zahamowań wegetacji, dlatego nawożenie musi być precyzyjne i umiarkowane. Nadmiar może prowadzić do nadmiernego gromadzenia azotanów lub pogorszenia jakości plonu.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.HIGH,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.MEDIUM,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.BIWEEKLY,
    dosageGuidance:
      'Stosuje się w mniejszych, ale regularnych dawkach w okresie budowy masy liściowej.',
    notes:
      'Ważne jest unikanie nadmiernego nawożenia azotem tuż przed zbiorem.',
    isActive: true,
  },
  {
    name: 'Nawóz NPK do warzyw korzeniowych',
    description:
      'Nawóz NPK do warzyw korzeniowych jest przeznaczony do upraw, w których plonem użytkowym są korzenie, bulwy lub zgrubienia podziemne, takie jak marchew, burak, pietruszka czy seler korzeniowy. W tego typu nawożeniu ważne jest zachowanie równowagi między wzrostem części nadziemnych a rozwojem organów spichrzowych. Tego rodzaju mieszanki zwykle ograniczają nadmierne pobudzanie wzrostu liści, a większy nacisk kładą na składniki wspierające rozwój korzeni i jakość plonu. Odpowiednio stosowany pomaga uzyskać bardziej wyrównane i wartościowe warzywa.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.TOP_DRESS,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.LOW,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.HIGH,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.MONTHLY,
    dosageGuidance:
      'Najczęściej stosuje się go jako nawożenie podstawowe lub we wczesnej fazie wzrostu, unikając przenawożenia azotem.',
    notes:
      'Szczególnie ważna jest tu dobra struktura gleby i umiar w nawożeniu azotowym.',
    isActive: true,
  },
  {
    name: 'Nawóz startowy do rozsady',
    description:
      'Nawóz startowy do rozsady to specjalistyczna mieszanka przeznaczona do wspierania młodych roślin w początkowym etapie wzrostu. Ma dostarczać składników w sposób bezpieczny dla delikatnego systemu korzeniowego i sprzyjać równomiernemu rozwojowi siewek oraz młodych sadzonek. W tej fazie ważne są dobra dostępność fosforu, umiarkowany poziom azotu i niski poziom zasolenia. Odpowiednie nawożenie startowe poprawia jakość rozsady, skraca stres po przesadzeniu i wspiera szybkie przyjęcie się roślin na stanowisku docelowym.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.LOW,
    phosphorusEffect: NutrientEffect.MEDIUM,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.WEEKLY,
    dosageGuidance:
      'Najczęściej stosowany jest w bardzo małych stężeniach i dawkach, odpowiednich do młodych roślin.',
    notes:
      'Przenawożenie rozsady jest szczególnie niebezpieczne i może prowadzić do zahamowania wzrostu.',
    isActive: true,
  },
  {
    name: 'Nawóz borowy',
    description:
      'Nawóz borowy służy do uzupełniania boru, mikroelementu niezbędnego do prawidłowego rozwoju merystemów, zawiązywania kwiatów, wzrostu korzeni i gospodarki cukrowej roślin. Niedobór boru może prowadzić do zaburzeń wzrostu, deformacji organów oraz obniżenia jakości plonu. Jest szczególnie istotny w uprawie warzyw korzeniowych, kapustnych oraz roślin zawiązujących duży plon generatywny. Ze względu na wąską granicę między dawką skuteczną a nadmierną wymaga ostrożnego stosowania.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosowany jest zwykle interwencyjnie lub profilaktycznie w małych dawkach dolistnych albo doglebowych.',
    notes:
      'Przedawkowanie boru może być toksyczne, dlatego warto stosować go tylko przy realnej potrzebie.',
    isActive: true,
  },
  {
    name: 'Nawóz manganowy',
    description:
      'Nawóz manganowy uzupełnia mangan, który odgrywa ważną rolę w procesach fotosyntezy, oddychania oraz aktywacji enzymów. Niedobory manganu mogą objawiać się chloroza i zaburzeniami wzrostu, szczególnie na glebach o wysokim pH. Nawóz ten jest wykorzystywany do korekty niedoborów oraz wsparcia prawidłowego przebiegu procesów metabolicznych roślin. Najczęściej stosuje się go dolistnie, ponieważ taka forma umożliwia szybsze działanie.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się go zwykle w małych dawkach, najczęściej dolistnie przy objawach niedoboru.',
    notes:
      'Niedobory manganu często wiążą się z niekorzystnym pH gleby, dlatego sama korekta nawozem nie zawsze wystarcza.',
    isActive: true,
  },
  {
    name: 'Nawóz cynkowy',
    description:
      'Nawóz cynkowy służy do uzupełniania cynku, mikroelementu biorącego udział w syntezie hormonów wzrostowych, aktywacji enzymów oraz prawidłowym rozwoju roślin. Jego niedobór może prowadzić do skrócenia międzywęźli, zahamowania wzrostu i charakterystycznych przebarwień liści. Jest stosowany zarówno profilaktycznie, jak i interwencyjnie, szczególnie w systemach intensywnej uprawy oraz na glebach, gdzie cynk jest słabo dostępny dla roślin.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Najczęściej stosowany jest dolistnie w niewielkich stężeniach.',
    notes:
      'Skuteczność nawożenia cynkiem może zależeć od pH i zawartości materii organicznej w glebie.',
    isActive: true,
  },
  {
    name: 'Nawóz miedziowy',
    description:
      'Nawóz miedziowy uzupełnia miedź, mikroelement istotny dla przemian enzymatycznych, lignifikacji tkanek oraz ogólnej kondycji roślin. Niedobór miedzi jest rzadszy niż niedobory niektórych innych pierwiastków, ale może prowadzić do osłabienia roślin, deformacji oraz pogorszenia jakości wzrostu. Nawozy miedziowe stosuje się ostrożnie, ponieważ miedź w nadmiarze może być toksyczna zarówno dla roślin, jak i dla życia biologicznego gleby.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.MAY_WORSEN,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Powinien być stosowany wyłącznie w małych dawkach, najlepiej po rozpoznaniu niedoboru.',
    notes:
      'Nadmiar miedzi może być problematyczny w glebach intensywnie użytkowanych i przy częstych zabiegach miedziowych.',
    isActive: true,
  },
  {
    name: 'Nawóz molibdenowy',
    description:
      'Nawóz molibdenowy dostarcza molibden, mikroelement ważny dla przemian azotowych w roślinie. Ma szczególne znaczenie przy redukcji azotanów i gospodarce azotem, dlatego jego niedobór może przypominać zaburzenia nawożenia azotowego mimo obecności azotu w glebie. Stosowany jest głównie interwencyjnie oraz w wyspecjalizowanych programach nawożenia, zwłaszcza przy warzywach o wrażliwości na niedobory tego składnika.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.VARIABLE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się bardzo małe dawki, zwykle dolistnie lub jako składnik programów mikroelementowych.',
    notes:
      'Molibden jest potrzebny w niewielkich ilościach, ale jego rola fizjologiczna jest istotna.',
    isActive: true,
  },
  {
    name: 'Nawóz żelazowy',
    description:
      'Nawóz żelazowy służy do uzupełniania żelaza, które jest niezbędne do syntezy chlorofilu i prawidłowego przebiegu procesów metabolicznych w roślinie. Niedobór żelaza objawia się zwykle chlorozą młodych liści, szczególnie na glebach zasadowych lub przy zaburzonej dostępności tego pierwiastka. Nawożenie żelazem bywa konieczne zwłaszcza w uprawie roślin w pojemnikach, pod osłonami i na glebach o wysokim pH. Najczęściej stosuje się formy szybko przyswajalne, często dolistnie lub doglebowo w postaci dobrze rozpuszczalnej.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Najczęściej stosuje się interwencyjnie przy objawach chlorozy młodych liści.',
    notes:
      'Sama aplikacja żelaza może nie wystarczyć, jeśli główną przyczyną problemu jest zbyt wysokie pH.',
    isActive: true,
  },
  {
    name: 'Nawóz mikroelementowy wieloskładnikowy',
    description:
      'Nawóz mikroelementowy wieloskładnikowy zawiera zestaw kilku mikroelementów jednocześnie, takich jak bor, mangan, cynk, miedź, molibden i żelazo. Jest przydatny tam, gdzie nie zdiagnozowano jednego konkretnego niedoboru, ale istnieje ryzyko osłabionej dostępności mikroelementów lub widoczne są niespecyficzne objawy niedożywienia. Może wspierać ogólną kondycję roślin, poprawiać przebieg procesów enzymatycznych i zmniejszać ryzyko ograniczenia wzrostu związanego z niedoborem śladowych pierwiastków. Najczęściej stosowany jest dolistnie.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.MONTHLY,
    dosageGuidance:
      'Stosuje się zgodnie z programem dokarmiania dolistnego, zwykle w niskim stężeniu i w kilku zabiegach sezonowych.',
    notes:
      'To wygodne rozwiązanie przy profilaktycznym wsparciu roślin w intensywnej uprawie.',
    isActive: true,
  },
  {
    name: 'Nawóz wapniowy dolistny',
    description:
      'Nawóz wapniowy dolistny służy do szybkiego uzupełniania wapnia bezpośrednio przez liście i inne nadziemne organy roślin. Jest szczególnie przydatny w uprawach narażonych na zaburzenia wynikające z lokalnego niedoboru wapnia, takie jak sucha zgnilizna wierzchołkowa owoców pomidora czy papryki, tipburn sałaty oraz problemy z jędrnością tkanek. Wapń jest składnikiem słabo przemieszczającym się w roślinie, dlatego dokarmianie dolistne może być ważnym uzupełnieniem nawożenia doglebowego. Nie zastępuje jednak całkowicie prawidłowej gospodarki wodnej i stabilnego pobierania wapnia przez korzenie.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.WEEKLY,
    dosageGuidance:
      'Stosuje się regularnie w małych stężeniach w okresach szybkiego wzrostu i tworzenia plonu.',
    notes:
      'Najlepiej działa jako element programu zapobiegającego zaburzeniom fizjologicznym.',
    isActive: true,
  },
  {
    name: 'Nawóz magnezowy dolistny',
    description:
      'Nawóz magnezowy dolistny umożliwia szybkie dostarczenie magnezu bezpośrednio przez liście. Jest szczególnie przydatny, gdy rośliny wykazują objawy niedoboru magnezu, takie jak żółknięcie starszych liści między nerwami. Dokarmianie dolistne pozwala ominąć część ograniczeń wynikających z niekorzystnego pH lub słabej dostępności magnezu w glebie. Wspiera fotosyntezę, wybarwienie liści oraz intensywność wzrostu. Najczęściej stosowany jest interwencyjnie lub jako uzupełnienie nawożenia doglebowego.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się w niewielkich stężeniach dolistnych, zwykle w kilku zabiegach powtarzanych co kilka dni lub tygodni.',
    notes: 'To szybki sposób interwencji przy widocznych niedoborach magnezu.',
    isActive: true,
  },
  {
    name: 'Nawóz potasowy dolistny',
    description:
      'Nawóz potasowy dolistny jest wykorzystywany do szybkiego wspierania roślin w okresach zwiększonego zapotrzebowania na potas. Potas odpowiada za gospodarkę wodną, jędrność tkanek, odporność na stres i jakość plonu. Dokarmianie dolistne może być pomocne zwłaszcza w okresie kwitnienia, zawiązywania i dojrzewania owoców, gdy zapotrzebowanie roślin na ten składnik rośnie. Nie zastępuje nawożenia doglebowego, ale stanowi ważne narzędzie interwencyjne i uzupełniające.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.MEDIUM,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Najczęściej stosowany jest dolistnie w kilku zabiegach w okresie intensywnego obciążenia plonem.',
    notes:
      'Sprawdza się szczególnie w uprawach warzyw owocujących i roślin narażonych na stres wodny.',
    isActive: true,
  },
  {
    name: 'Nawóz mikroelementowy dolistny',
    description:
      'Nawóz mikroelementowy dolistny to szybkie narzędzie do uzupełniania mikroelementów bezpośrednio przez liście. Jest wykorzystywany zarówno w profilaktyce, jak i przy pierwszych objawach niedoborów. Dzięki aplikacji dolistnej składniki trafiają do roślin szybko, co bywa szczególnie ważne w intensywnej produkcji warzyw, podczas stresu środowiskowego lub na glebach o ograniczonej dostępności mikroelementów. Może wspierać prawidłowe wybarwienie, metabolizm, rozwój kwiatów i ogólną kondycję roślin.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.MONTHLY,
    dosageGuidance:
      'Stosuje się w niskich stężeniach, zwykle w kilku zabiegach sezonowych lub interwencyjnie.',
    notes:
      'Nie zastępuje prawidłowego odczynu i zbilansowanego nawożenia doglebowego, ale skutecznie uzupełnia program żywienia roślin.',
    isActive: true,
  },
  {
    name: 'Mączka bazaltowa',
    description:
      'Mączka bazaltowa to drobno zmielona skała wulkaniczna stosowana jako naturalny materiał poprawiający właściwości gleby oraz jako źródło niektórych pierwiastków śladowych. Nie działa jak szybki nawóz mineralny, lecz raczej jako długofalowy dodatek poprawiający jakość podłoża. Wspiera tworzenie lepszej struktury gleby, może poprawiać zdolność sorpcyjną oraz stopniowo uwalniać mikroelementy. Jest ceniona w ogrodnictwie ekologicznym i regeneracyjnym, szczególnie tam, gdzie zależy na trwałej poprawie jakości gleby, a nie tylko na krótkotrwałym efekcie nawozowym.',
    category: FertilizerCategory.SOIL_AMENDMENT,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.LOW,
    potassiumEffect: NutrientEffect.LOW,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.INCREASES,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Stosuje się ją jako dodatek do gleby lub kompostu, zwykle przedsiewnie lub przy regeneracji stanowiska.',
    notes:
      'Działa wolno i najlepiej sprawdza się jako element długofalowego programu poprawy gleby.',
    isActive: true,
  },
  {
    name: 'Zeolit',
    description:
      'Zeolit to mineralny materiał o bardzo wysokiej pojemności sorpcyjnej, wykorzystywany do poprawy właściwości fizykochemicznych gleby. Nie jest klasycznym nawozem makroskładnikowym, lecz dodatkiem poprawiającym zdolność gleby do zatrzymywania wody i składników pokarmowych. Dzięki swojej strukturze może ograniczać wymywanie części jonów, stabilizować środowisko korzeniowe oraz poprawiać efektywność nawożenia. Jest szczególnie przydatny w glebach lekkich, przepuszczalnych oraz w uprawach pojemnikowych, gdzie zasoby wody i składników szybko się wyczerpują.',
    category: FertilizerCategory.SOIL_AMENDMENT,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.VARIABLE,
    phosphorusEffect: NutrientEffect.VARIABLE,
    potassiumEffect: NutrientEffect.VARIABLE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.INCREASES,
    recommendedFrequency: RecommendedFrequency.ONE_TIME,
    dosageGuidance:
      'Najczęściej miesza się go z podłożem lub glebą przy zakładaniu stanowiska albo w trakcie regeneracji gleby.',
    notes:
      'To raczej stabilizator środowiska korzeniowego niż klasyczny nawóz odżywczy.',
    isActive: true,
  },
  {
    name: 'Krzem nawozowy',
    description:
      'Krzem nawozowy jest stosowany jako preparat wzmacniający rośliny i poprawiający ich odporność mechaniczną oraz tolerancję na stres. Krzem nie jest klasyfikowany jako podstawowy pierwiastek pokarmowy dla wszystkich roślin, ale jego obecność może korzystnie wpływać na wytrzymałość tkanek, ograniczenie skutków suszy, zasolenia oraz niektórych stresów biotycznych. W praktyce ogrodniczej wykorzystywany jest jako element programów wspierających kondycję roślin, szczególnie w warunkach intensywnej uprawy i dużego obciążenia środowiskowego.',
    category: FertilizerCategory.BIO_STIMULANT,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.BIWEEKLY,
    dosageGuidance:
      'Stosuje się go zwykle dolistnie lub doglebowo jako preparat wspomagający, w seriach zabiegów w okresach stresu lub intensywnego wzrostu.',
    notes:
      'Jego główna wartość polega na wsparciu fizjologii i wytrzymałości roślin, a nie na klasycznym nawożeniu makroelementami.',
    isActive: true,
  },
  {
    name: 'Kwasy humusowe',
    description:
      'Kwasy humusowe to grupa związków organicznych powstających w wyniku rozkładu materii organicznej i tworzenia próchnicy. W ogrodnictwie są stosowane jako preparat wspierający żyzność gleby, rozwój systemu korzeniowego, aktywność mikroorganizmów oraz efektywność pobierania składników pokarmowych. Nie działają jak typowy nawóz NPK, lecz raczej jako regulator jakości środowiska glebowego. Mogą poprawiać strukturę gleby, zwiększać pojemność sorpcyjną, wspierać retencję wody i stabilizować warunki wzrostu roślin. Są szczególnie przydatne w glebach zmęczonych, ubogich lub intensywnie eksploatowanych.',
    category: FertilizerCategory.BIO_STIMULANT,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.VARIABLE,
    phosphorusEffect: NutrientEffect.VARIABLE,
    potassiumEffect: NutrientEffect.VARIABLE,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.MONTHLY,
    dosageGuidance:
      'Najczęściej stosuje się je w formie podlewania gleby lub jako dodatek do systematycznego programu poprawy podłoża.',
    notes:
      'Ich działanie jest bardziej pośrednie i biologiczne niż bezpośrednio nawozowe.',
    isActive: true,
  },
  {
    name: 'Preparat humusowy',
    description:
      'Preparat humusowy to ogólna kategoria środków opartych na związkach próchnicznych, najczęściej kwasach humusowych i fulwowych, stosowanych do poprawy jakości gleby i wsparcia roślin. Takie preparaty pomagają aktywizować życie biologiczne, poprawiają pojemność sorpcyjną gleby, wspierają rozwój korzeni i ułatwiają roślinom korzystanie ze składników obecnych w podłożu. Dobrze sprawdzają się w regeneracji stanowisk, uprawie pojemnikowej, zagonach podwyższonych oraz wszędzie tam, gdzie gleba wymaga poprawy biologicznej i strukturalnej.',
    category: FertilizerCategory.BIO_STIMULANT,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.VARIABLE,
    phosphorusEffect: NutrientEffect.VARIABLE,
    potassiumEffect: NutrientEffect.VARIABLE,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.MONTHLY,
    dosageGuidance:
      'Zwykle stosuje się go w regularnych odstępach jako wsparcie gleby, zwłaszcza na początku sezonu lub po intensywnej uprawie.',
    notes:
      'Preparaty humusowe nie zastępują nawożenia podstawowego, ale znacząco poprawiają warunki wykorzystania składników przez rośliny.',
    isActive: true,
  },
  {
    name: 'Nawóz mikrobiologiczny',
    description:
      'Nawóz mikrobiologiczny to preparat zawierający pożyteczne mikroorganizmy, których zadaniem jest wspieranie biologicznej aktywności gleby oraz procesów związanych z dostępnością składników odżywczych. Może zawierać bakterie, grzyby lub ich mieszaniny, a jego główna rola polega na poprawie środowiska korzeniowego, przyspieszaniu rozkładu resztek organicznych, zwiększaniu dostępności niektórych pierwiastków i wspieraniu regeneracji gleby. Tego typu preparaty są coraz częściej wykorzystywane w nowoczesnym ogrodnictwie jako element zrównoważonego podejścia do żywienia roślin.',
    category: FertilizerCategory.BIO_STIMULANT,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.VARIABLE,
    phosphorusEffect: NutrientEffect.VARIABLE,
    potassiumEffect: NutrientEffect.VARIABLE,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej stosuje się go na glebę lub do strefy korzeniowej, zwykle w okresie przygotowania stanowiska lub po stresie uprawowym.',
    notes:
      'Skuteczność zależy od warunków środowiskowych, wilgotności, temperatury i ogólnej jakości gleby.',
    isActive: true,
  },
  {
    name: 'Preparat z bakteriami glebowymi',
    description:
      'Preparat z bakteriami glebowymi to środek biologiczny zawierający wyselekcjonowane szczepy bakterii wspierających procesy zachodzące w glebie. W zależności od składu może ułatwiać mineralizację resztek organicznych, zwiększać dostępność fosforu, wspierać pobieranie azotu lub poprawiać równowagę biologiczną w strefie korzeniowej. Tego rodzaju preparaty nie zastępują bezpośrednio nawożenia klasycznymi składnikami, ale mogą poprawiać efektywność wykorzystania zasobów gleby i ogólną kondycję uprawy.',
    category: FertilizerCategory.BIO_STIMULANT,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.WATERING,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.VARIABLE,
    phosphorusEffect: NutrientEffect.VARIABLE,
    potassiumEffect: NutrientEffect.VARIABLE,
    phEffect: PhEffect.VARIABLE,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.SEASONAL,
    dosageGuidance:
      'Najczęściej aplikowany jest do gleby lub systemu korzeniowego, często przy zakładaniu uprawy lub regeneracji stanowiska.',
    notes:
      'Najlepiej działa w glebie bogatej w materię organiczną i przy ograniczeniu czynników niszczących mikrobiologię podłoża.',
    isActive: true,
  },
  {
    name: 'Preparat mikoryzowy',
    description:
      'Preparat mikoryzowy zawiera grzyby mikoryzowe, które tworzą symbiozę z korzeniami roślin. Dzięki temu mogą zwiększać powierzchnię chłonną systemu korzeniowego, wspierać pobieranie wody i składników odżywczych oraz poprawiać odporność roślin na stres. Mikoryza nie jest klasycznym nawozem dostarczającym duże ilości makroskładników, lecz biologicznym wsparciem funkcjonowania systemu korzeniowego. Jest szczególnie przydatna przy sadzeniu roślin wieloletnich, w ubogich glebach, w uprawie pojemnikowej i przy regeneracji stanowiska.',
    category: FertilizerCategory.BIO_STIMULANT,
    form: FertilizerForm.SOLID,
    applicationMethod: ApplicationMethod.INCORPORATE,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.VARIABLE,
    phosphorusEffect: NutrientEffect.VARIABLE,
    potassiumEffect: NutrientEffect.VARIABLE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.IMPROVES,
    waterRetentionEffect: EffectLevel.INCREASES,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.ONE_TIME,
    dosageGuidance:
      'Stosuje się bezpośrednio przy korzeniach lub do dołka sadzeniowego, aby zapewnić kontakt z systemem korzeniowym.',
    notes:
      'Działa najlepiej tam, gdzie nie stosuje się agresywnych praktyk niszczących grzyby glebowe.',
    isActive: true,
  },
  {
    name: 'Chelat żelaza',
    description:
      'Chelat żelaza to specjalistyczny nawóz mikroelementowy zawierający żelazo w formie chelatowej, czyli związanej z ligandem organicznym, który utrzymuje pierwiastek w formie lepiej dostępnej dla roślin. Taka forma ma szczególne znaczenie na glebach o podwyższonym pH, gdzie zwykłe formy żelaza szybko stają się trudno przyswajalne. Chelat żelaza jest wykorzystywany przede wszystkim do szybkiego korygowania niedoborów objawiających się chlorozą młodych liści, osłabieniem wzrostu oraz pogorszeniem intensywności fotosyntezy. W praktyce ogrodniczej i profesjonalnej produkcji warzyw jest ceniony za skuteczność działania w sytuacjach, gdy standardowe nawożenie żelazem okazuje się niewystarczające. Może być stosowany zarówno dolistnie, jak i doglebowo, zależnie od formulacji oraz celu zabiegu. Jest to nawóz szczególnie przydatny w uprawie pod osłonami, w pojemnikach, na podłożach o niestabilnym pH oraz w systemach intensywnego nawożenia, gdzie szybka korekta niedoboru ma istotne znaczenie dla jakości i wielkości plonu.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Najczęściej stosuje się go interwencyjnie przy objawach niedoboru żelaza lub profilaktycznie na stanowiskach, gdzie żelazo bywa słabo dostępne. Dawkowanie powinno być dostosowane do formulacji oraz sposobu aplikacji.',
    notes:
      'Chelat żelaza jest szczególnie przydatny na glebach zasadowych i w uprawach, w których klasyczne formy żelaza szybko tracą dostępność dla roślin.',
    isActive: true,
  },
  {
    name: 'Chelat cynku',
    description:
      'Chelat cynku to nawóz mikroelementowy zawierający cynk w formie chelatowej, dzięki czemu składnik pozostaje bardziej stabilny i lepiej przyswajalny przez rośliny niż w wielu tradycyjnych formulacjach. Cynk odgrywa istotną rolę w syntezie hormonów wzrostowych, aktywacji enzymów oraz regulacji wielu procesów metabolicznych zachodzących w roślinie. Niedobór cynku może prowadzić do zahamowania wzrostu, skrócenia międzywęźli, deformacji liści i pogorszenia kondycji roślin. Forma chelatowa jest szczególnie cenna tam, gdzie dostępność cynku w glebie jest ograniczona przez pH lub inne warunki chemiczne. Chelat cynku znajduje zastosowanie w intensywnej uprawie warzyw, roślin sadowniczych oraz w profesjonalnej produkcji rozsady. Jest stosowany głównie dolistnie, gdy zależy na szybkim efekcie, ale może być także używany w systemach fertygacyjnych zależnie od rodzaju produktu. Jego największą wartością jest skuteczność w warunkach, w których zwykłe nawożenie cynkiem nie daje satysfakcjonujących rezultatów.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Stosuje się go głównie w niewielkich dawkach dolistnych przy objawach niedoboru cynku lub profilaktycznie w uprawach o większym ryzyku niedoborów.',
    notes:
      'Forma chelatowa zwiększa stabilność i dostępność cynku, szczególnie na stanowiskach problematycznych pod względem chemicznym.',
    isActive: true,
  },
  {
    name: 'Chelat manganu',
    description:
      'Chelat manganu to specjalistyczny nawóz mikroelementowy zawierający mangan w formie chelatowej, co poprawia jego stabilność oraz przyswajalność w warunkach, gdzie zwykłe formy mogą być mniej skuteczne. Mangan uczestniczy w wielu procesach enzymatycznych i ma duże znaczenie dla fotosyntezy, syntezy chlorofilu oraz prawidłowego funkcjonowania metabolizmu roślin. Jego niedobór może objawiać się chloroza, osłabieniem wzrostu i zaburzeniami rozwoju liści. Chelat manganu jest szczególnie użyteczny na glebach o wyższym pH, gdzie dostępność tego pierwiastka może być ograniczona. W praktyce ogrodniczej stosuje się go najczęściej dolistnie, aby szybko dostarczyć roślinie przyswajalny mangan i ograniczyć rozwój objawów niedoboru. Sprawdza się w intensywnej uprawie warzyw, roślin sadowniczych oraz w systemach produkcji, w których wysoka jakość liści i sprawna fotosynteza mają duże znaczenie dla finalnego plonu.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.LOW,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Najczęściej stosuje się go dolistnie w małych dawkach przy widocznych objawach niedoboru manganu lub zapobiegawczo na stanowiskach problemowych.',
    notes:
      'Chelat manganu jest szczególnie przydatny tam, gdzie dostępność tego pierwiastka ogranicza odczyn gleby lub warunki uprawowe.',
    isActive: true,
  },
  {
    name: 'Chelat miedzi',
    description:
      'Chelat miedzi to nawóz mikroelementowy zawierający miedź w stabilnej formie chelatowej, która poprawia dostępność pierwiastka dla roślin i ułatwia jego wykorzystanie w warunkach utrudnionego pobierania. Miedź bierze udział w licznych procesach enzymatycznych, wpływa na lignifikację tkanek, metabolizm roślin oraz ogólną kondycję wzrostową. Niedobór miedzi może objawiać się osłabieniem wzrostu, deformacjami tkanek, zaburzeniami rozwoju i spadkiem jakości plonu. Chelat miedzi jest stosowany głównie w sytuacjach wymagających precyzyjnego i skutecznego uzupełnienia mikroelementu bez nadmiernego ryzyka wytrącania się składnika lub jego szybkiej utraty dostępności. Najczęściej stosowany jest dolistnie, zwłaszcza w systemach profesjonalnych, gdzie ważna jest szybka reakcja na objawy niedoboru. Ze względu na to, że miedź w nadmiarze może być niekorzystna dla roślin i biologii gleby, nawóz ten wymaga świadomego dawkowania i stosowania zgodnego z realną potrzebą uprawy.',
    category: FertilizerCategory.MINERAL,
    form: FertilizerForm.LIQUID,
    applicationMethod: ApplicationMethod.FOLIAR,
    riskLevel: RiskLevel.MEDIUM,
    nitrogenEffect: NutrientEffect.NONE,
    phosphorusEffect: NutrientEffect.NONE,
    potassiumEffect: NutrientEffect.NONE,
    phEffect: PhEffect.NEUTRAL,
    soilStructureEffect: SoilStructureEffect.NEUTRAL,
    waterRetentionEffect: EffectLevel.NEUTRAL,
    drainageEffect: EffectLevel.NEUTRAL,
    recommendedFrequency: RecommendedFrequency.AS_NEEDED,
    dosageGuidance:
      'Powinien być stosowany w bardzo umiarkowanych dawkach, najczęściej dolistnie i najlepiej po rozpoznaniu rzeczywistego niedoboru.',
    notes:
      'Chelat miedzi daje precyzyjne wsparcie mikroelementowe, ale ze względu na potencjalną fitotoksyczność i wpływ na mikrobiologię gleby wymaga ostrożnego stosowania.',
    isActive: true,
  },
] as const;

export async function upsertDefaultFertilizers(
  em: EntityManager,
): Promise<void> {
  for (const seed of DEFAULT_FERTILIZERS) {
    let fertilizer = await em.findOne(FertilizerType, {
      name: { $ilike: seed.name },
    });

    if (!fertilizer) {
      fertilizer = new FertilizerType();
      fertilizer.name = seed.name;
    }

    fertilizer.description = seed.description;
    fertilizer.category = seed.category;
    fertilizer.form = seed.form;
    fertilizer.applicationMethod = seed.applicationMethod;
    fertilizer.riskLevel = seed.riskLevel;
    fertilizer.nitrogenEffect = seed.nitrogenEffect;
    fertilizer.phosphorusEffect = seed.phosphorusEffect;
    fertilizer.potassiumEffect = seed.potassiumEffect;
    fertilizer.phEffect = seed.phEffect;
    fertilizer.soilStructureEffect = seed.soilStructureEffect;
    fertilizer.waterRetentionEffect = seed.waterRetentionEffect;
    fertilizer.drainageEffect = seed.drainageEffect;
    fertilizer.recommendedFrequency = seed.recommendedFrequency;
    fertilizer.dosageGuidance = seed.dosageGuidance;
    fertilizer.notes = seed.notes;
    fertilizer.isActive = seed.isActive;

    em.persist(fertilizer);
  }

  await em.flush();
}
