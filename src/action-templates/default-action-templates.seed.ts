import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTemplate } from './action-template.entity';
import {
  ActionTemplateEnvironment,
  ActionTemplateTarget,
  ActionTemplateType,
} from '../common/enums/action.enums';
import { toSlug } from '../common/utils/slug.util';

type ActionTemplateSeedRecord = {
  name: string;
  description: string | null;
  target: ActionTemplateTarget;
  environment: ActionTemplateEnvironment;
  type: ActionTemplateType;
  defaultDueOffsetDays: number | null;
};

export const DEFAULT_ACTION_TEMPLATES: readonly ActionTemplateSeedRecord[] = [
  {
    name: 'Siew nasion',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOWING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Pikowanie siewek',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.TRANSPLANTING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Sadzenie rozsady',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.TRANSPLANTING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Przesadzanie roślin',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.TRANSPLANTING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Dosadzanie roślin',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.TRANSPLANTING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Podlewanie roślin',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.WATERING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Kontrola wilgotności gleby',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Ściółkowanie wokół roślin',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.PHYSICAL_PROTECTION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Usuwanie chwastów przy roślinach',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.WEEDING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Nawożenie organiczne',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Nawożenie mineralne',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Aplikacja biohumusu',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Nawożenie dolistne',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Awaryjne nawożenie interwencyjne',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.FERTILIZATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Podwiązywanie roślin',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.STAKING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Przycinanie roślin',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.PRUNING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Usuwanie pędów bocznych',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.PRUNING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Usuwanie liści',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.PRUNING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Kontrola szkodników',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.PEST_CONTROL,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Kontrola chorób',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Usuwanie porażonych części',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Usunięcie całej rośliny (silna choroba)',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.DISEASE_CONTROL,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Oprysk biologiczny',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SPRAYING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Oprysk chemiczny',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SPRAYING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Monitoring wzrostu',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Monitoring kwitnienia',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Zapylanie ręczne',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.MANUAL_CUSTOM,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Zbiór plonów',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.HARVEST,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Zbiór nasion',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.HARVEST,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Usunięcie roślin po sezonie',
    description: null,
    target: ActionTemplateTarget.PLANTING,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.HARVEST,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Pomiar pH gleby',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_TESTING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Analiza NPK gleby',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_TESTING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Pomiar zasolenia gleby (EC)',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.SOIL_TESTING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Przygotowanie grządki przed sezonem',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Spulchnianie gleby',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Głębokie spulchnianie (broadfork)',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Formowanie grządki',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_PREPARATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Aplikacja kompostu',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Aplikacja obornika',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Aplikacja nawozu zielonego',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Aplikacja nawozu mineralnego',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_AMENDMENT,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Mulczowanie grządki',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.MULCHING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Uprawa roślin poplonowych',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_REGENERATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Solarizacja gleby',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.OUTDOOR,
    type: ActionTemplateType.SOIL_REGENERATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Przykrycie gleby (agrowłóknina)',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SOIL_REGENERATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Instalacja systemu nawadniania',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.IRRIGATION_SETUP,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Kontrola wilgotności gleby (grządka)',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Płukanie gleby (redukcja zasolenia)',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.IRRIGATION_SETUP,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Instalacja siatek ochronnych',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.PHYSICAL_PROTECTION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Instalacja pułapek na szkodniki',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.TRAP_SETUP,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Usuwanie chwastów z grządki',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.WEEDING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Planowanie płodozmianu',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.ROTATION_PLANNING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Zmiana uprawy w grządce',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.ROTATION_PLANNING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Przygotowanie grządki po sezonie',
    description: null,
    target: ActionTemplateTarget.BED,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.BED_READY,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Codzienna kontrola klimatu — tunel',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.CLIMATE_CONTROL,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Codzienna kontrola klimatu — szklarnia',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.CLIMATE_CONTROL,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Wentylacja tunelu',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.VENTILATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Wentylacja szklarni',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.VENTILATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Redukcja wilgotności — tunel',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.HUMIDITY_REDUCTION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Redukcja wilgotności — szklarnia',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.HUMIDITY_REDUCTION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Instalacja cieniowania — tunel',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.SHADING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Instalacja cieniowania — szklarnia',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.SHADING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Regulacja cieniowania — tunel',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.SHADING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Regulacja cieniowania — szklarnia',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.SHADING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Kontrola konstrukcji tunelu',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.STRUCTURE_INSPECTION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Kontrola konstrukcji szklarni',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.STRUCTURE_INSPECTION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Naprawa folii tunelu',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.STRUCTURE_REPAIR,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Naprawa szyb szklarni',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.STRUCTURE_REPAIR,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Mycie konstrukcji tunelu',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.SPACE_HYGIENE,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Mycie konstrukcji szklarni',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.SPACE_HYGIENE,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Czyszczenie przestrzeni uprawowej',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SPACE_HYGIENE,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Dezynfekcja przestrzeni uprawowej — tunel',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.SPACE_HYGIENE,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Dezynfekcja przestrzeni uprawowej — szklarnia',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.SPACE_HYGIENE,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Usuwanie resztek roślinnych',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SPACE_HYGIENE,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Monitoring temperatury',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Monitoring wilgotności powietrza',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Monitoring szkodników (pułapki)',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.MONITORING,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Przygotowanie tunelu do sezonu',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.TUNNEL,
    type: ActionTemplateType.SEASONAL_PREPARATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Przygotowanie szklarni do sezonu',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.GREENHOUSE,
    type: ActionTemplateType.SEASONAL_PREPARATION,
    defaultDueOffsetDays: null,
  },
  {
    name: 'Przygotowanie do zimy',
    description: null,
    target: ActionTemplateTarget.SPACE,
    environment: ActionTemplateEnvironment.ANY,
    type: ActionTemplateType.SEASONAL_PREPARATION,
    defaultDueOffsetDays: null,
  },
];

export const upsertDefaultActionTemplates = async (
  em: EntityManager,
): Promise<void> => {
  for (const item of DEFAULT_ACTION_TEMPLATES) {
    const slug = toSlug(item.name);
    const existingBySlug = await em.findOne(ActionTemplate, { slug });
    if (existingBySlug) {
      existingBySlug.name = item.name;
      existingBySlug.description = item.description;
      existingBySlug.target = item.target;
      existingBySlug.environment = item.environment;
      existingBySlug.type = item.type;
      existingBySlug.defaultDueOffsetDays = item.defaultDueOffsetDays;
      continue;
    }

    const existingExact = await em.findOne(ActionTemplate, {
      name: { $ilike: item.name },
      target: item.target,
      environment: item.environment,
      type: item.type,
    });

    if (existingExact) {
      existingExact.slug = slug;
      existingExact.name = item.name;
      existingExact.description = item.description;
      existingExact.defaultDueOffsetDays = item.defaultDueOffsetDays;
      continue;
    }

    const existingByName = await em.findOne(ActionTemplate, {
      name: { $ilike: item.name },
    });

    if (existingByName) {
      existingByName.name = item.name;
      existingByName.slug = slug;
      existingByName.target = item.target;
      existingByName.environment = item.environment;
      existingByName.type = item.type;
      existingByName.description = item.description;
      existingByName.defaultDueOffsetDays = item.defaultDueOffsetDays;
      continue;
    }

    const template = new ActionTemplate();
    template.name = item.name;
    template.slug = slug;
    template.description = item.description;
    template.target = item.target;
    template.environment = item.environment;
    template.type = item.type;
    template.defaultDueOffsetDays = item.defaultDueOffsetDays;

    em.persist(template);
  }

  await em.flush();
};
