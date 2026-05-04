import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';
import { Planting } from '../plantings/planting.entity';
import { VegetableActionRule } from '../vegetables/vegetable-action-rule.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
  ActionTemplateGenerationMode,
} from '../common/enums/action.enums';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { addDays, normalizeDueAt } from '../common/types/date-utils';

describe('ActionAutomationService direct sow routines', () => {
  const service = new ActionAutomationService({} as EntityManager);

  const makePlanting = (sowedAt: Date | null): Planting =>
    ({
      id: 'planting-1',
      startMethod: PlantingStartMethod.DIRECT_SOW,
      status: PlantingStatus.IN_GROUND,
      plannedStartDate: new Date('2026-03-01T00:00:00.000Z'),
      actualStartDate: new Date('2026-03-01T00:00:00.000Z'),
      sowedAt,
      transplantedAt: null,
      harvestWindowStart: null,
      harvestWindowEnd: null,
      harvestedAt: null,
      timelineTimezone: 'Europe/Warsaw',
    }) as Planting;

  const makeRule = (): VegetableActionRule =>
    ({
      id: 'rule-1',
      trigger: ActionRuleTrigger.AFTER_SOWING_DAYS,
      offsetDays: 1,
      schedule: ActionRuleSchedule.EVERY_N_DAYS,
      everyNDays: 7,
      isEnabled: true,
      actionTemplate: {
        id: 'template-1',
        name: 'Kontrola wilgotności',
        generationMode: ActionTemplateGenerationMode.ROUTINE,
      } as ActionTemplate,
    }) as VegetableActionRule;

  it('generates AFTER_SOWING_DAYS routine tasks when sowedAt is present', () => {
    const target = service as unknown as {
      buildCandidatesForPlanting: (
        planting: Planting,
        rules: VegetableActionRule[],
      ) => Array<{ trigger: ActionRuleTrigger; dueAt: Date }>;
    };

    const rule = makeRule();

    const sowedAtForTodayDue = addDays(
      normalizeDueAt(new Date(), 'Europe/Warsaw'),
      -1,
    );
    const withSowedAt = target.buildCandidatesForPlanting(
      makePlanting(sowedAtForTodayDue),
      [rule],
    );
    expect(withSowedAt.length).toBeGreaterThan(0);
    expect(withSowedAt[0]?.trigger).toBe(ActionRuleTrigger.AFTER_SOWING_DAYS);
    expect(normalizeDueAt(withSowedAt[0].dueAt, 'Europe/Warsaw').getTime()).toBe(
      normalizeDueAt(new Date(), 'Europe/Warsaw').getTime(),
    );
  });
});
