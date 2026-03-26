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
      'Gleba piaszczysta zawiera przewagę ziaren piasku i niewielki udział frakcji drobnych, dlatego jest lekka, luźna i bardzo przepuszczalna. Szybko się nagrzewa, dobrze napowietrza strefę korzeniową i rzadko powoduje zastoiska wody, ale ma niską pojemność wodną i sorpcyjną. Składniki pokarmowe łatwo ulegają z niej wypłukiwaniu, dlatego wymaga częstego uzupełniania materii organicznej oraz starannego prowadzenia nawożenia i nawadniania.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.LOW,
    drainage: DrainageLevel.GOOD,
    fertilityLevel: DemandLevel.LOW,
    advantages: [
      'Niski opór mechaniczny ułatwia przygotowanie warstwy uprawnej',
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
      'Regularnie wprowadzaj kompost lub dobrze rozłożony obornik, aby zwiększyć pojemność wodną i sorpcyjną',
      'Stosuj ściółkę, aby ograniczyć parowanie i przegrzewanie powierzchni gleby',
      'Prowadź częstsze, ale umiarkowane podlewanie zamiast rzadkich i obfitych dawek',
      'Wprowadzaj poplony i rośliny okrywowe, aby zwiększać udział próchnicy',
    ],
    phMin: 5.5,
    phMax: 6.8,
  },
  {
    name: 'Gleba gliniasto-piaszczysta',
    description:
      'Gleba gliniasto-piaszczysta łączy cechy frakcji piaszczystej i gliniastej, dzięki czemu zwykle zapewnia korzystny kompromis między retencją wody, napowietrzeniem i stabilnością struktury. Zatrzymuje więcej wody i składników pokarmowych niż gleba piaszczysta, ale jest łatwiejsza w uprawie niż gleby ciężkie. Przy właściwym udziale materii organicznej stanowi bardzo dobre podłoże do uprawy wielu warzyw.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.HIGH,
    advantages: [
      'Dobrze równoważy retencję wody i napowietrzenie',
      'Składniki pokarmowe są mniej podatne na wypłukiwanie niż w glebach lekkich',
      'Ma wysoką przydatność do uprawy większości warzyw',
      'Przy właściwej agrotechnice dobrze utrzymuje strukturę',
    ],
    disadvantages: [
      'Wymaga regularnego wzbogacania materią organiczną',
      'Może się pogarszać przy intensywnej uprawie',
      'Przy przesuszeniu może się kruszyć i pylić',
    ],
    improvementTips: [
      'Regularnie uzupełniaj materię organiczną, aby stabilizować strukturę i aktywność biologiczną gleby',
      'Stosuj zmianowanie i poplony, aby ograniczać spadek żyzności',
      'Nie pozostawiaj gleby długo bez okrywy, aby ograniczyć przesuszanie i degradację struktury',
      'Monitoruj zagęszczenie warstwy uprawnej przy intensywnym użytkowaniu',
    ],
    phMin: 6.0,
    phMax: 7.0,
  },
  {
    name: 'Gleba gliniasta',
    description:
      'Gleba gliniasta zawiera wysoki udział frakcji ilastej oraz domieszkę pyłu i piasku. Charakteryzuje się dużą pojemnością wodną i dobrą zdolnością zatrzymywania składników pokarmowych, ale ma słabsze napowietrzenie i wolniejszy odpływ nadmiaru wody. W warunkach nadmiernego uwilgotnienia łatwo ulega zlewaniu i zagęszczeniu, natomiast po przesuszeniu może twardnieć i pękać. Wiosną nagrzewa się wolniej niż gleby lżejsze, dlatego wymaga starannego przygotowania stanowiska i systematycznej poprawy struktury.',
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
      'Regularnie wprowadzaj kompost i dobrze rozłożoną materię organiczną, aby poprawić agregację i napowietrzenie gleby',
      'Nie wykonuj uprawek, gdy gleba jest nadmiernie mokra, aby nie pogłębiać zagęszczenia',
      'Stosuj ściółkowanie, aby ograniczyć zaskorupianie i stabilizować wilgotność',
      'Na stanowiskach podmokłych rozważ podwyższone grządki lub poprawę odpływu wody',
    ],
    phMin: 6.0,
    phMax: 7.2,
  },
  {
    name: 'Gleba ilasta',
    description:
      'Gleba ilasta zawiera bardzo wysoki udział drobnych cząstek iłu, dlatego należy do najcięższych typów gleb. Cechuje się bardzo dużą pojemnością wodną i wysoką zdolnością sorpcyjną, ale jednocześnie słabym napowietrzeniem i bardzo ograniczonym odpływem nadmiaru wody. Jest podatna na zaskorupianie, zlewanie oraz silne zagęszczenie, a po przesuszeniu może twardnieć i pękać. W uprawie warzyw wymaga konsekwentnej poprawy struktury i ostrożnego doboru terminu prac polowych.',
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
      'Systematycznie dodawaj kompost i grubszą materię organiczną, aby poprawić strukturę agregatową',
      'Unikaj pracy na mokrej glebie, ponieważ łatwo dochodzi do trwałego zagęszczenia',
      'Stosuj ściółkowanie, aby ograniczyć zaskorupianie powierzchni',
      'Na trudniejszych stanowiskach rozważ podwyższone grządki lub poprawę drenażu',
    ],
    phMin: 6.2,
    phMax: 7.4,
  },
  {
    name: 'Gleba pylasta',
    description:
      'Gleba pylasta zawiera przewagę frakcji pyłowej, dlatego zwykle dobrze magazynuje wodę i składniki pokarmowe, ale jednocześnie jest podatna na zagęszczenie, zaskorupianie i erozję. W warstwie uprawnej może dawać dobre warunki dla wzrostu roślin, o ile utrzymywana jest odpowiednia ilość materii organicznej i nie dochodzi do nadmiernego udeptywania lub intensywnej degradacji struktury.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.HIGH,
    advantages: [
      'Dobrze magazynuje wodę',
      'Może być zasobna w składniki pokarmowe',
      'Przy dobrej strukturze ma wysoką przydatność uprawową',
    ],
    disadvantages: [
      'Łatwo się zagęszcza',
      'Może tworzyć skorupę',
      'Podatna na erozję',
    ],
    improvementTips: [
      'Regularnie dodawaj kompost, aby poprawić stabilność struktury i ograniczyć zaskorupianie',
      'Stosuj ściółkowanie, aby chronić powierzchnię gleby przed zaskorupieniem i erozją',
      'Wprowadzaj rośliny okrywowe lub poplony, aby wspierać strukturę i aktywność biologiczną',
      'Unikaj częstego deptania i przejazdów po wilgotnej glebie',
    ],
    phMin: 6.0,
    phMax: 7.2,
  },
  {
    name: 'Gleba próchniczna',
    description:
      'Gleba próchniczna zawiera wysoki udział stabilnej materii organicznej, dzięki czemu charakteryzuje się dobrą strukturą, wysoką aktywnością biologiczną i znaczną zdolnością magazynowania wody oraz składników pokarmowych. Zwykle zapewnia korzystne warunki dla rozwoju systemu korzeniowego, ponieważ łączy dobrą retencję z właściwym napowietrzeniem. Jest jednym z najbardziej przydatnych typów gleb w uprawie warzyw, pod warunkiem utrzymywania zasobności w materię organiczną.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.HIGH,
    advantages: [
      'Wysoka zawartość materii organicznej poprawia pojemność wodną i sorpcyjną',
      'Dobra struktura sprzyja rozwojowi systemu korzeniowego',
      'Aktywność biologiczna gleby wspiera udostępnianie składników pokarmowych',
      'Ma bardzo wysoką przydatność do uprawy wielu warzyw',
    ],
    disadvantages: ['Wymaga utrzymania poziomu materii organicznej'],
    improvementTips: [
      'Regularnie uzupełniaj materię organiczną, aby utrzymać stabilny poziom próchnicy',
      'Stosuj ściółkowanie, aby ograniczać straty wilgoci i erozję powierzchniową',
      'Wprowadzaj poplony, aby podtrzymywać aktywność biologiczną i strukturę gleby',
      'Nie pozostawiaj gleby długo bez okrywy, szczególnie po zbiorach',
    ],
    phMin: 6.0,
    phMax: 7.0,
  },
  {
    name: 'Gleba torfowa',
    description:
      'Gleba torfowa powstaje z nagromadzonej materii organicznej w warunkach długotrwałego uwilgotnienia. Cechuje się bardzo wysoką pojemnością wodną i dużą zawartością substancji organicznej, ale jej właściwości fizyczne i chemiczne mogą być niekorzystne dla części warzyw. Zwykle ma odczyn kwaśny i wymaga świadomego doboru gatunków oraz ewentualnej korekty parametrów stanowiska. W uprawie warzyw często konieczne jest ograniczenie nadmiernego uwilgotnienia oraz poprawa stabilności struktury.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.HIGH,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Bardzo dobrze zatrzymuje wilgoć',
      'Zawiera dużo materii organicznej',
    ],
    disadvantages: ['Często kwaśna', 'Może być zbyt wilgotna'],
    improvementTips: [
      'Skontroluj odczyn przed planowaniem upraw wymagających wyższego pH',
      'Przy uprawie roślin preferujących mniej kwaśny odczyn rozważ korektę pH',
      'Domieszkuj glebę mineralną, aby poprawić stabilność struktury',
      'Na stanowiskach nadmiernie wilgotnych zadbaj o ograniczenie zastoin wody',
    ],
    phMin: 4.5,
    phMax: 6.0,
  },
  {
    name: 'Gleba żwirowo-kamienista',
    description:
      'Gleba żwirowo-kamienista zawiera duży udział frakcji szkieletowej, dlatego cechuje się bardzo szybkim odpływem wody, małą pojemnością wodną i niską zdolnością zatrzymywania składników pokarmowych. Szybko się nagrzewa i zwykle dobrze napowietrza strefę korzeniową, ale w uprawie warzyw wymaga intensywnego wzbogacania w materię organiczną oraz starannego prowadzenia nawadniania.',
    structure: SoilStructure.LOOSE,
    waterRetention: DemandLevel.LOW,
    drainage: DrainageLevel.GOOD,
    fertilityLevel: DemandLevel.LOW,
    advantages: ['Bardzo dobra przepuszczalność', 'Szybko się nagrzewa'],
    disadvantages: [
      'Słabo zatrzymuje wodę',
      'Słabo zatrzymuje składniki pokarmowe',
    ],
    improvementTips: [
      'Systematycznie dodawaj kompost, aby zwiększyć udział frakcji drobnych i poprawić pojemność wodną',
      'Stosuj ściółkowanie, aby ograniczyć straty wody i przegrzewanie powierzchni',
      'Prowadź częstsze, ale umiarkowane nawadnianie',
      'W miarę potrzeby twórz warstwę uprawną wzbogaconą w materię organiczną lub drobniejszą frakcję mineralną',
    ],
    phMin: 6.0,
    phMax: 7.5,
  },
  {
    name: 'Ziemia ogrodowa uniwersalna',
    description:
      'Ziemia ogrodowa uniwersalna nie jest naturalnym typem gleby, lecz gotowym podłożem użytkowym stosowanym w ogrodach, skrzyniach i podwyższonych grządkach. Zwykle stanowi mieszaninę frakcji mineralnych oraz materii organicznej przygotowaną tak, aby zapewnić szerokie zastosowanie w uprawie roślin ogrodowych. Jej rzeczywiste właściwości mogą istotnie różnić się w zależności od składu i jakości produktu.',
    structure: SoilStructure.CRUMBLY,
    waterRetention: DemandLevel.MEDIUM,
    drainage: DrainageLevel.MEDIUM,
    fertilityLevel: DemandLevel.MEDIUM,
    advantages: [
      'Może stanowić gotowe podłoże startowe do uprawy',
      'Zwykle ma wyrównaną strukturę fizyczną',
      'Nadaje się do skrzyń, pojemników i podwyższonych grządek',
    ],
    disadvantages: [
      'Parametry fizyczne i chemiczne zależą od producenta i składu mieszanki',
      'Może wymagać korekty nawożenia i uzupełniania materii organicznej',
    ],
    improvementTips: [
      'Sprawdzaj skład i odczyn przed zastosowaniem do bardziej wymagających upraw',
      'Uzupełniaj kompost lub inną materię organiczną przy dłuższym użytkowaniu',
      'Dostosowuj nawożenie do rzeczywistej zasobności podłoża',
      'Kontroluj tempo przesychania i zagęszczenia w skrzyniach oraz pojemnikach',
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
