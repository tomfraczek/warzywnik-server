import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTemplate } from './action-template.entity';
import {
  ActionTemplateTarget,
  ActionTemplateType,
} from '../common/enums/action.enums';

type ActionTemplateSeedRecord = {
  id: string;
  name: string;
  description: string;
  target: ActionTemplateTarget;
  type: ActionTemplateType;
  defaultDueOffsetDays: number;
};

export const DEFAULT_ACTION_TEMPLATES: readonly ActionTemplateSeedRecord[] = [
  {
    id: 'd8aa2191-4b12-470d-8e0e-d7c603f6c001',
    name: 'Podlej roślinę',
    description: 'Podlej roślinę zgodnie z aktualnymi warunkami pogodowymi.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.WATER,
    defaultDueOffsetDays: 0,
  },
  {
    id: 'd8aa2191-4b12-470d-8e0e-d7c603f6c002',
    name: 'Nawożenie pogłówne',
    description: 'Zastosuj nawożenie pogłówne w odpowiedniej dawce.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.FERTILIZE,
    defaultDueOffsetDays: 0,
  },
  {
    id: 'd8aa2191-4b12-470d-8e0e-d7c603f6c003',
    name: 'Oprysk ochronny',
    description: 'Wykonaj oprysk ochronny zgodnie z zaleceniami.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.SPRAY,
    defaultDueOffsetDays: 0,
  },
  {
    id: 'd8aa2191-4b12-470d-8e0e-d7c603f6c004',
    name: 'Odchwaszczanie grządki',
    description: 'Usuń chwasty i rozluźnij górną warstwę gleby.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.WEED,
    defaultDueOffsetDays: 0,
  },
  {
    id: 'd8aa2191-4b12-470d-8e0e-d7c603f6c005',
    name: 'Przygotuj glebę',
    description: 'Przygotuj stanowisko przed siewem lub sadzeniem.',
    target: ActionTemplateTarget.BED,
    type: ActionTemplateType.SOIL_PREP,
    defaultDueOffsetDays: 0,
  },
  {
    id: 'd8aa2191-4b12-470d-8e0e-d7c603f6c006',
    name: 'Zbiór plonu',
    description: 'Wykonaj zbiór dojrzałych warzyw.',
    target: ActionTemplateTarget.PLANTING,
    type: ActionTemplateType.HARVEST,
    defaultDueOffsetDays: 0,
  },
] as const;

export const upsertDefaultActionTemplates = async (
  em: EntityManager,
): Promise<void> => {
  for (const item of DEFAULT_ACTION_TEMPLATES) {
    await em.upsert(ActionTemplate, {
      id: item.id,
      name: item.name,
      description: item.description,
      target: item.target,
      type: item.type,
      defaultDueOffsetDays: item.defaultDueOffsetDays,
    });
  }

  await em.flush();
};
