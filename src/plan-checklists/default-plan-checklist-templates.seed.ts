import { EntityManager } from '@mikro-orm/postgresql';
import {
  PlanChecklistPriority,
  PlanChecklistScope,
} from '../common/enums/plan-checklist.enums';
import { PlanChecklistTemplate } from './plan-checklist-template.entity';

type PlanChecklistTemplateSeed = {
  slug: string;
  titleTemplate: string;
  descriptionTemplate?: string | null;
  reasonTemplate?: string | null;
  scope: PlanChecklistScope;
  priority: PlanChecklistPriority;
  conditions: Record<string, unknown>;
  version?: number;
  isActive?: boolean;
};

export const DEFAULT_PLAN_CHECKLIST_TEMPLATES: readonly PlanChecklistTemplateSeed[] =
  [
    {
      slug: 'buy-seeds-direct-sow',
      titleTemplate: 'Kup nasiona {vegetableName}',
      descriptionTemplate: 'Przygotuj nasiona przed planowanym siewem.',
      reasonTemplate:
        'Uprawa ma start metodą siewu bezpośredniego i wymaga nasion.',
      scope: PlanChecklistScope.PLANTING,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'seed_purchase_direct_sow' },
    },
    {
      slug: 'prepare-seedlings',
      titleTemplate: 'Przygotuj rozsadę {vegetableName}',
      descriptionTemplate:
        'Zapewnij harmonogram produkcji rozsady przed startem uprawy.',
      reasonTemplate: 'Wybrana metoda startu to rozsada.',
      scope: PlanChecklistScope.PLANTING,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'seedling_preparation_transplant' },
    },
    {
      slug: 'prepare-seedling-containers-and-substrate',
      titleTemplate: 'Przygotuj pojemniki i podłoże do rozsady {vegetableName}',
      descriptionTemplate:
        'Przygotuj multiplaty/pojemniki i lekkie podłoże do produkcji rozsady.',
      reasonTemplate: 'Rozsada wymaga przygotowania stanowiska startowego.',
      scope: PlanChecklistScope.PLANTING,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'seedling_containers_transplant' },
    },
    {
      slug: 'check-bed-depth',
      titleTemplate: 'Sprawdź głębokość grządki dla {vegetableName}',
      descriptionTemplate:
        'Zweryfikuj czy głębokość grządki spełnia minimum dla tej uprawy.',
      reasonTemplate:
        'Głębokość grządki może być niewystarczająca dla wybranego warzywa.',
      scope: PlanChecklistScope.PLANTING,
      priority: PlanChecklistPriority.HIGH,
      conditions: { kind: 'bed_depth_too_small' },
    },
    {
      slug: 'check-soil-fit',
      titleTemplate: 'Sprawdź dopasowanie gleby do {vegetableName}',
      descriptionTemplate:
        'Obecna gleba grządki nie jest na liście rekomendowanych dla tej uprawy.',
      reasonTemplate:
        'Dopasowanie gleby do warzywa może obniżyć jakość i stabilność plonu.',
      scope: PlanChecklistScope.PLANTING,
      priority: PlanChecklistPriority.HIGH,
      conditions: { kind: 'soil_not_recommended' },
    },
    {
      slug: 'improve-soil-with-compost',
      titleTemplate: 'Popraw strukturę gleby kompostem',
      descriptionTemplate:
        'Rozważ dodanie kompostu przed rozpoczęciem sezonu planowanych upraw.',
      reasonTemplate:
        'Gleba lub zapotrzebowanie pokarmowe planowanych warzyw wskazuje potrzebę wzbogacenia.',
      scope: PlanChecklistScope.BED,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'improve_soil_with_compost' },
    },
    {
      slug: 'improve-water-retention',
      titleTemplate: 'Popraw retencję wody w glebie',
      descriptionTemplate:
        'Dla zaplanowanych warzyw warto zwiększyć zdolność gleby do zatrzymywania wilgoci.',
      reasonTemplate:
        'Gleba ma niską retencję, a część planowanych warzyw ma wysokie zapotrzebowanie na wodę.',
      scope: PlanChecklistScope.BED,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'improve_water_retention' },
    },
    {
      slug: 'plan-fertilization-before-start',
      titleTemplate: 'Zaplanuj nawożenie przed sadzeniem',
      descriptionTemplate:
        'Przygotuj plan startowego nawożenia dla warzyw o wysokim zapotrzebowaniu.',
      reasonTemplate:
        'W planie są warzywa o wysokim zapotrzebowaniu pokarmowym.',
      scope: PlanChecklistScope.BED,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'plan_fertilization_before_start' },
    },
    {
      slug: 'check-npk-fertilizer',
      titleTemplate:
        'Sprawdź nawóz bogaty w {nutrientLabel} dla {vegetableName}',
      descriptionTemplate:
        'Dobierz nawóz odpowiadający dominującemu zapotrzebowaniu pokarmowemu tej uprawy.',
      reasonTemplate:
        'Warzywo ma dominujące zapotrzebowanie na {nutrientLabel}.',
      scope: PlanChecklistScope.PLANTING,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'check_npk_fertilizer' },
    },
    {
      slug: 'clean-bed-before-plan',
      titleTemplate: 'Oczyść grządkę przed rozpoczęciem planu',
      descriptionTemplate:
        'Usuń resztki roślin i chwasty, aby przygotować miejsce pod nowe uprawy.',
      reasonTemplate: 'W grządce znajdują się zaplanowane uprawy do startu.',
      scope: PlanChecklistScope.BED,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'bed_has_new_plantings' },
    },
    {
      slug: 'loosen-and-level-bed',
      titleTemplate: 'Spulchnij i wyrównaj powierzchnię grządki',
      descriptionTemplate:
        'Przygotuj jednolitą strukturę podłoża przed siewem/sadzeniem.',
      reasonTemplate: 'Plan grządki zawiera uprawy oczekujące na start.',
      scope: PlanChecklistScope.BED,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'bed_has_new_plantings' },
    },
    {
      slug: 'mark-rows-for-plan',
      titleTemplate: 'Wyznacz miejsca/rzędy pod zaplanowane uprawy',
      descriptionTemplate:
        'Rozplanuj rozmieszczenie warzyw na grządce przed startem sezonu.',
      reasonTemplate: 'Plan zawiera aktywne pozycje do rozplanowania.',
      scope: PlanChecklistScope.BED,
      priority: PlanChecklistPriority.MEDIUM,
      conditions: { kind: 'bed_has_new_plantings' },
    },
    {
      slug: 'check-companion-conflict',
      titleTemplate: 'Sprawdź sąsiedztwo {vegetableName}',
      descriptionTemplate:
        'W planie grządki wykryto potencjalny konflikt sąsiedztwa z {otherVegetableName}.',
      reasonTemplate: 'Zaplanowane warzywa mogą być niekorzystnym sąsiedztwem.',
      scope: PlanChecklistScope.PLANTING,
      priority: PlanChecklistPriority.HIGH,
      conditions: { kind: 'bad_companion_conflict' },
    },
  ];

export const upsertDefaultPlanChecklistTemplates = async (
  em: EntityManager,
): Promise<void> => {
  for (const seed of DEFAULT_PLAN_CHECKLIST_TEMPLATES) {
    const existing = await em.findOne(PlanChecklistTemplate, {
      slug: seed.slug,
    });

    if (existing) {
      existing.titleTemplate = seed.titleTemplate;
      existing.descriptionTemplate = seed.descriptionTemplate ?? null;
      existing.reasonTemplate = seed.reasonTemplate ?? null;
      existing.scope = seed.scope;
      existing.priority = seed.priority;
      existing.conditions = seed.conditions;
      existing.isActive = seed.isActive ?? true;
      existing.version = seed.version ?? 1;
      continue;
    }

    const template = new PlanChecklistTemplate();
    template.slug = seed.slug;
    template.titleTemplate = seed.titleTemplate;
    template.descriptionTemplate = seed.descriptionTemplate ?? null;
    template.reasonTemplate = seed.reasonTemplate ?? null;
    template.scope = seed.scope;
    template.priority = seed.priority;
    template.conditions = seed.conditions;
    template.isActive = seed.isActive ?? true;
    template.version = seed.version ?? 1;

    em.persist(template);
  }

  await em.flush();
};
