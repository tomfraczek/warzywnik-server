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
      'Lekka gleba o dużej zawartości piasku. Szybko się nagrzewa, łatwo się ją uprawia, ale szybko przesycha i słabiej zatrzymuje składniki pokarmowe.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.LOW,
    drainage: DrainageLevel.GOOD,
    fertilityLevel: DemandLevel.LOW,
    advantages: [
      'Szybko nagrzewa się wiosną',
      'Jest łatwa w uprawie i spulchnianiu',
      'Dobrze napowietrza korzenie',
      'Dobrze odprowadza nadmiar wody',
    ],
    disadvantages: [
      'Szybko przesycha',
      'Słabo zatrzymuje składniki pokarmowe',
      'Wymaga częstszego podlewania',
      'Łatwo się wyjaławia',
    ],
    improvementTips: [
      'Regularnie dodawaj kompost',
      'Stosuj ściółkowanie, aby ograniczyć parowanie',
      'Podlewaj rzadziej, ale obficiej',
      'Wzbogać glebę materią organiczną',
    ],
    phMin: 5.5,
    phMax: 6.8,
  },
  {
    name: 'Gleba gliniasto-piaszczysta',
    description:
      'Gleba średnia, zbalansowana, łącząca zalety piasku i gliny. Dobrze nadaje się do większości warzyw i jest jedną z najlepszych gleb ogrodowych.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Dobrze łączy retencję wody i przepuszczalność',
      'Jest stosunkowo łatwa w uprawie',
      'Nadaje się do większości warzyw',
      'Dobrze utrzymuje strukturę',
    ],
    disadvantages: [
      'Wymaga regularnego wzbogacania materią organiczną',
      'Może się pogarszać przy intensywnej uprawie',
      'Przy przesuszeniu może się pylić',
    ],
    improvementTips: [
      'Regularnie dodawaj kompost',
      'Nie zostawiaj gleby odkrytej na długo',
      'Stosuj zmianowanie i poplony',
      'Utrzymuj stały poziom próchnicy',
    ],
    phMin: 6.0,
    phMax: 7.0,
  },
  {
    name: 'Gleba gliniasta',
    description:
      'Gleba zasobna i chłonna, zwykle żyzna, ale cięższa w uprawie. Dobrze trzyma wodę i składniki pokarmowe, jednak może być zbyt zbita i słabiej napowietrzona.',
    structure: SoilStructure.COMPACT,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.POOR,
    fertilityLevel: DemandLevel.HIGH,
    advantages: [
      'Dobrze zatrzymuje wodę',
      'Jest zwykle zasobna w składniki pokarmowe',
      'Dobrze nadaje się do roślin o większych wymaganiach',
      'Wolniej przesycha latem',
    ],
    disadvantages: [
      'Wolno się nagrzewa wiosną',
      'Łatwo się zbija',
      'Może powodować zastoiska wody',
      'Jest trudniejsza w uprawie po deszczu',
    ],
    improvementTips: [
      'Dodawaj kompost i materię organiczną',
      'Nie uprawiaj gleby, gdy jest bardzo mokra',
      'Rozluźniaj strukturę regularnym ściółkowaniem',
      'Rozważ podwyższone grządki przy wrażliwszych uprawach',
    ],
    phMin: null,
    phMax: null,
  },
  {
    name: 'Gleba ilasta',
    description:
      'Bardzo ciężka, zwięzła gleba o dużej zawartości drobnych cząstek. Silnie zatrzymuje wodę i składniki, ale jest trudna w uprawie, słabo napowietrzona i łatwo się zbryla.',
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
      'Łatwo się zbija i zaskorupia',
      'Słabo przepuszcza wodę',
      'Korzenie mają gorszy dostęp do powietrza',
    ],
    improvementTips: [
      'Dodawaj dużo kompostu i materii organicznej',
      'Unikaj udeptywania i pracy na mokrej glebie',
      'Rozważ uprawę na podwyższonych grządkach',
      'Poprawiaj strukturę stopniowo przez kilka sezonów',
    ],
    phMin: null,
    phMax: null,
  },
  {
    name: 'Gleba pylasta',
    description:
      'Gleba drobna, miękka i często dość żyzna. Lepiej trzyma wilgoć niż piasek, ale łatwo się zagęszcza i może tworzyć zaskorupienie.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Dobrze zatrzymuje wilgoć',
      'Jest zwykle dość żyzna',
      'Bywa przyjemna w uprawie przy dobrej strukturze',
    ],
    disadvantages: [
      'Łatwo się zagęszcza',
      'Może się zaskorupiać',
      'Jest podatna na erozję przy odkrytej powierzchni',
    ],
    improvementTips: [
      'Dodawaj kompost dla poprawy struktury',
      'Nie zostawiaj gleby bez ściółki lub okrywy',
      'Unikaj częstego deptania',
      'Stosuj poplony i rośliny okrywowe',
    ],
    phMin: null,
    phMax: null,
  },
  {
    name: 'Gleba próchniczna',
    description:
      'Gleba bogata w materię organiczną, zwykle bardzo dobra do uprawy warzyw. Dobrze trzyma wodę i składniki pokarmowe, a jednocześnie ma korzystną strukturę.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.HIGH,
    advantages: [
      'Jest bardzo dobra dla większości warzyw',
      'Dobrze zatrzymuje wodę',
      'Jest zasobna w składniki pokarmowe',
      'Ma korzystną strukturę dla korzeni',
    ],
    disadvantages: [
      'Wymaga utrzymywania poziomu materii organicznej',
      'Przy przesuszeniu może tracić dobrą strukturę',
    ],
    improvementTips: [
      'Uzupełniaj próchnicę kompostem',
      'Ściółkuj glebę przez cały sezon',
      'Stosuj zmianowanie i poplony',
      'Unikaj pozostawiania gleby gołej',
    ],
    phMin: 6.0,
    phMax: 7.0,
  },
  {
    name: 'Gleba torfowa',
    description:
      'Gleba bogata w materię organiczną i wilgoć, zwykle kwaśna. Dobrze magazynuje wodę, ale może być zbyt mokra, chłodna i specyficzna dla części upraw warzywnych.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Bardzo dobrze zatrzymuje wilgoć',
      'Zawiera dużo materii organicznej',
      'Dobrze nadaje się do roślin lubiących kwaśniejsze warunki',
    ],
    disadvantages: [
      'Bywa zbyt kwaśna dla wielu warzyw',
      'Może być zbyt mokra i chłodna',
      'Nie zawsze nadaje się uniwersalnie do warzywnika',
    ],
    improvementTips: [
      'Sprawdź pH przed sadzeniem warzyw',
      'W razie potrzeby rozważ wapnowanie',
      'Popraw strukturę przez domieszki ziemi mineralnej lub kompostu',
      'Dbaj o odpowiednie odwodnienie',
    ],
    phMin: 4.5,
    phMax: 6.0,
  },
  {
    name: 'Gleba żwirowa / kamienista',
    description:
      'Bardzo przepuszczalna gleba z dużym udziałem żwiru lub kamieni. Szybko oddaje wodę, szybko się nagrzewa, ale jest uboga i trudniejsza dla wielu warzyw.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.LOW,
    drainage: DrainageLevel.GOOD,
    fertilityLevel: DemandLevel.LOW,
    advantages: [
      'Bardzo dobrze odprowadza wodę',
      'Szybko się nagrzewa',
      'Dobrze sprawdza się przy roślinach niewymagających mokrego podłoża',
    ],
    disadvantages: [
      'Słabo zatrzymuje wodę',
      'Słabo zatrzymuje składniki pokarmowe',
      'Jest trudniejsza dla większości warzyw',
      'Wymaga poprawy przed intensywną uprawą',
    ],
    improvementTips: [
      'Dodawaj dużo kompostu i żyznej ziemi',
      'Ściółkuj glebę, aby ograniczyć przesychanie',
      'Stosuj nawadnianie regularne',
      'Rozważ uprawę w skrzyniach lub na grządkach podwyższonych',
    ],
    phMin: null,
    phMax: null,
  },
  {
    name: 'Ziemia ogrodowa uniwersalna',
    description:
      'Uniwersalne podłoże ogrodowe lub mieszanka ziemi stosowana w ogrodzie, skrzyniach i podwyższonych grządkach. To praktyczna kategoria dla użytkowników, którzy korzystają z gotowych podłoży.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Jest uniwersalna i wygodna w użyciu',
      'Nadaje się do wielu zastosowań ogrodowych',
      'Zwykle ma dobrą strukturę startową',
    ],
    disadvantages: [
      'Jakość może się różnić zależnie od producenta',
      'Nie zawsze jest wystarczająco żyzna na cały sezon',
      'Wymaga obserwacji wilgotności i nawożenia',
    ],
    improvementTips: [
      'Sprawdzaj skład i jakość podłoża',
      'Wzbogacaj kompostem w kolejnych sezonach',
      'Dostosuj nawożenie do rodzaju uprawy',
      'Kontroluj przesychanie w skrzyniach i donicach',
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
