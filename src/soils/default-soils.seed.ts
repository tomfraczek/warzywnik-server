import { EntityManager } from '@mikro-orm/postgresql';
import { Soil } from './soil.entity';
import {
  DemandLevel,
  DrainageLevel,
  SoilStructure,
} from '../common/enums/soil.enums';

type SoilSeedRecord = {
  name: string;
  description: string;
  structure: SoilStructure;
  waterRetention: DemandLevel;
  drainage: DrainageLevel;
  fertilityLevel: DemandLevel;
  advantages: string[];
  disadvantages: string[];
  improvementTips: string[];
  phMin: number | null;
  phMax: number | null;
};

export const DEFAULT_SOILS: readonly SoilSeedRecord[] = [
  {
    name: 'Gleba piaszczysta',
    description:
      'Gleba piaszczysta zawiera dużą ilość ziaren piasku i bardzo mało drobnych cząstek gliny lub iłu. Dzięki temu jest lekka, luźna i bardzo przepuszczalna. Woda szybko przez nią przepływa, dlatego gleba ta rzadko zatrzymuje wilgoć na długo. Szybko nagrzewa się wiosną, co pozwala wcześniej rozpocząć uprawę roślin. Jednocześnie jednak szybko wysycha i łatwo traci składniki pokarmowe, które są wypłukiwane wraz z wodą w głąb gleby. W naturalnych warunkach występuje często na terenach nadmorskich, wydmach oraz w regionach z dużą ilością piasków polodowcowych. W ogrodnictwie wymaga systematycznego wzbogacania materią organiczną, aby poprawić jej zdolność do zatrzymywania wody i składników odżywczych.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.LOW,
    drainage: DrainageLevel.GOOD,
    fertilityLevel: DemandLevel.LOW,
    advantages: [
      'Bardzo łatwa w uprawie i spulchnianiu',
      'Szybko nagrzewa się wiosną, co przyspiesza sezon wegetacyjny',
      'Dobrze napowietrza korzenie roślin',
      'Rzadko dochodzi do zastoin wody i gnicia korzeni',
    ],
    disadvantages: [
      'Bardzo szybko traci wilgoć',
      'Składniki pokarmowe łatwo wypłukują się z gleby',
      'Wymaga częstszego podlewania w czasie suszy',
      'Może szybko się wyjaławiać bez regularnego nawożenia',
    ],
    improvementTips: [
      'Regularnie dodawaj kompost lub dobrze rozłożony obornik',
      'Stosuj ściółkowanie, aby ograniczyć parowanie wody z gleby',
      'Uprawiaj rośliny okrywowe lub poplony',
      'Wzbogać glebę materią organiczną, aby poprawić retencję wody',
    ],
    phMin: 5.5,
    phMax: 6.8,
  },
  {
    name: 'Gleba gliniasto-piaszczysta',
    description:
      'Gleba gliniasto-piaszczysta jest glebą średnią, która łączy w sobie właściwości piasku i gliny. Zawiera zarówno większe cząstki piasku, jak i drobniejsze frakcje gliny oraz pyłu. Dzięki temu ma zrównoważoną strukturę i jest uznawana za jedną z najlepszych gleb do uprawy warzyw. Dobrze zatrzymuje wodę, ale jednocześnie pozwala jej nadmiarowi odpływać. Korzenie roślin mają w niej odpowiedni dostęp do powietrza, a składniki pokarmowe nie są tak łatwo wypłukiwane jak w glebie piaszczystej. Jest stosunkowo łatwa w uprawie i daje dobre plony przy odpowiedniej pielęgnacji.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Zrównoważone właściwości wodne i powietrzne',
      'Bardzo dobra do uprawy większości warzyw',
      'Łatwa w uprawie i spulchnianiu',
      'Dobrze utrzymuje strukturę gleby',
    ],
    disadvantages: [
      'Wymaga regularnego wzbogacania materią organiczną',
      'Może się pogarszać przy intensywnej uprawie',
      'Przy przesuszeniu może się kruszyć i pylić',
    ],
    improvementTips: [
      'Regularnie dodawaj kompost',
      'Stosuj zmianowanie roślin',
      'Nie pozostawiaj gleby odkrytej na długi czas',
      'Uprawiaj rośliny poplonowe',
    ],
    phMin: 6.0,
    phMax: 7.0,
  },
  {
    name: 'Gleba gliniasta',
    description:
      'Gleba gliniasta zawiera dużą ilość cząstek gliny oraz pewną ilość piasku i pyłu. Jest znacznie cięższa niż gleba piaszczysta, ale dzięki temu dobrze zatrzymuje wodę i składniki pokarmowe. Zwykle jest żyzna i może dawać dobre plony, jednak jej uprawa bywa trudniejsza. W czasie opadów staje się lepka i zbita, a po wyschnięciu może twardnieć i pękać. Gleba ta wolniej się nagrzewa wiosną, przez co sezon wegetacyjny może zaczynać się nieco później.',
    structure: SoilStructure.COMPACT,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.POOR,
    fertilityLevel: DemandLevel.HIGH,
    advantages: [
      'Dobrze zatrzymuje wodę',
      'Jest zasobna w składniki pokarmowe',
      'Może być bardzo żyzna przy dobrej strukturze',
      'Rzadziej wymaga intensywnego nawożenia',
    ],
    disadvantages: [
      'Wolno się nagrzewa wiosną',
      'Może być zbita i trudna w uprawie',
      'Może powodować zastoiska wody',
      'Jest trudniejsza w uprawie po deszczu',
    ],
    improvementTips: [
      'Dodawaj kompost i materię organiczną',
      'Unikaj pracy w glebie gdy jest bardzo mokra',
      'Regularnie spulchniaj i ściółkuj glebę',
      'Rozważ podwyższone grządki dla wrażliwych upraw',
    ],
    phMin: null,
    phMax: null,
  },
  {
    name: 'Gleba ilasta',
    description:
      'Gleba ilasta zawiera bardzo dużą ilość drobnych cząstek iłu. Jest to jedna z najcięższych gleb pod względem struktury. Silnie zatrzymuje wodę oraz składniki mineralne, ale jednocześnie jest słabo przepuszczalna i słabo napowietrzona. W czasie wilgotnej pogody może być bardzo lepka, a po wyschnięciu staje się twarda i pęka. Uprawa roślin w takiej glebie jest trudniejsza i wymaga systematycznego poprawiania jej struktury.',
    structure: SoilStructure.COMPACT,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.POOR,
    fertilityLevel: DemandLevel.HIGH,
    advantages: [
      'Dobrze zatrzymuje wodę',
      'Może być bardzo zasobna w składniki mineralne',
      'Wolno się wyjaławia',
    ],
    disadvantages: [
      'Jest bardzo trudna w uprawie',
      'Słaba przepuszczalność wody',
      'Słabe napowietrzenie korzeni',
      'Może tworzyć zbitą skorupę',
    ],
    improvementTips: [
      'Dodawaj duże ilości kompostu',
      'Stosuj ściółkowanie',
      'Unikaj pracy na mokrej glebie',
      'Poprawiaj strukturę gleby przez kilka sezonów',
    ],
    phMin: null,
    phMax: null,
  },
  {
    name: 'Gleba pylasta',
    description:
      'Gleba pylasta składa się głównie z drobnych cząstek pyłu. Jest miękka, gładka i często bardzo żyzna. Dobrze zatrzymuje wilgoć i składniki pokarmowe, ale łatwo się zagęszcza i może tworzyć twardą skorupę na powierzchni gleby. Przy odpowiedniej pielęgnacji może być bardzo dobrą glebą ogrodową.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Dobrze zatrzymuje wilgoć',
      'Często jest żyzna',
      'Dobra do wielu upraw',
    ],
    disadvantages: [
      'Łatwo się zagęszcza',
      'Może tworzyć skorupę',
      'Podatna na erozję',
    ],
    improvementTips: [
      'Dodawaj kompost',
      'Stosuj ściółkowanie',
      'Uprawiaj rośliny okrywowe',
      'Unikaj częstego deptania gleby',
    ],
    phMin: null,
    phMax: null,
  },
  {
    name: 'Gleba próchniczna',
    description:
      'Gleba próchniczna zawiera dużą ilość materii organicznej powstałej z rozkładu roślin i mikroorganizmów. Jest zwykle bardzo żyzna i ma dobrą strukturę, dzięki czemu jest jedną z najlepszych gleb do uprawy warzyw i roślin ogrodowych. Dobrze zatrzymuje wodę, ale jednocześnie zapewnia korzeniom odpowiednie napowietrzenie.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.HIGH,
    advantages: [
      'Jest bardzo dobra dla większości warzyw',
      'Dobrze zatrzymuje wodę',
      'Bogata w składniki pokarmowe',
      'Dobra struktura dla korzeni',
    ],
    disadvantages: ['Wymaga utrzymania poziomu materii organicznej'],
    improvementTips: [
      'Regularnie dodawaj kompost',
      'Ściółkuj glebę',
      'Stosuj poplony',
      'Unikaj pozostawiania gleby bez okrywy',
    ],
    phMin: 6.0,
    phMax: 7.0,
  },
  {
    name: 'Gleba torfowa',
    description:
      'Gleba torfowa powstaje z nagromadzonej materii organicznej w środowiskach podmokłych. Jest lekka, bardzo chłonna i zwykle kwaśna. Dobrze magazynuje wodę, ale może być zbyt wilgotna dla wielu warzyw. Często wymaga poprawy struktury oraz regulacji pH.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Bardzo dobrze zatrzymuje wilgoć',
      'Zawiera dużo materii organicznej',
    ],
    disadvantages: [
      'Często kwaśna',
      'Może być zbyt wilgotna',
    ],
    improvementTips: [
      'Sprawdź pH gleby',
      'Rozważ wapnowanie',
      'Popraw strukturę przez dodanie ziemi mineralnej',
    ],
    phMin: 4.5,
    phMax: 6.0,
  },
  {
    name: 'Gleba żwirowa / kamienista',
    description:
      'Gleba z dużą ilością żwiru lub kamieni. Jest bardzo przepuszczalna i szybko się nagrzewa, ale słabo zatrzymuje wodę i składniki pokarmowe.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.LOW,
    drainage: DrainageLevel.GOOD,
    fertilityLevel: DemandLevel.LOW,
    advantages: [
      'Bardzo dobra przepuszczalność',
      'Szybko się nagrzewa',
    ],
    disadvantages: [
      'Słabo zatrzymuje wodę',
      'Słabo zatrzymuje składniki pokarmowe',
    ],
    improvementTips: [
      'Dodawaj kompost',
      'Stosuj ściółkowanie',
      'Regularnie podlewaj',
    ],
    phMin: null,
    phMax: null,
  },
  {
    name: 'Ziemia ogrodowa uniwersalna',
    description:
      'Uniwersalne podłoże stosowane w ogrodach, skrzyniach i podwyższonych grządkach. Zwykle jest to mieszanka różnych typów gleby oraz materii organicznej, przygotowana tak, aby była odpowiednia dla większości roślin ogrodowych.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Uniwersalna',
      'Dobra struktura startowa',
    ],
    disadvantages: ['Jakość zależy od producenta'],
    improvementTips: [
      'Sprawdzaj skład podłoża',
      'Wzbogacaj kompostem',
      'Dostosuj nawożenie',
    ],
    phMin: 6.0,
    phMax: 7.0,
  },
] as const;

export async function upsertDefaultSoils(em: EntityManager): Promise<void> {
  for (const seed of DEFAULT_SOILS) {
    let soil = await em.findOne(Soil, {
      name: { $ilike: seed.name },
    });

    if (!soil) {
      soil = new Soil();
      soil.name = seed.name;
    }

    soil.description = seed.description;
    soil.structure = seed.structure;
    soil.waterRetention = seed.waterRetention;
    soil.drainage = seed.drainage;
    soil.phMin = seed.phMin;
    soil.phMax = seed.phMax;
    soil.fertilityLevel = seed.fertilityLevel;
    soil.advantages = [...seed.advantages];
    soil.disadvantages = [...seed.disadvantages];
    soil.improvementTips = [...seed.improvementTips];

    em.persist(soil);
  }

  await em.flush();
}
