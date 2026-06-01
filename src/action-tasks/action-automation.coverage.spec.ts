import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { VegetableActionRule } from '../vegetables/vegetable-action-rule.entity';
import {
  ActionRuleTrigger,
  ActionTemplateGenerationMode,
} from '../common/enums/action.enums';

describe('ActionAutomationService coverage', () => {
  it('computes hard/soft coverage status per vegetable and globally', async () => {
    type CoverageResult = {
      coverage: {
        hardMinimumRulesPerStartMethod: number;
        softTargetRulesPerStartMethod: number;
        totalVegetables: number;
        totalMethodPairs: number;
        pairsMeetingHardMinimum: number;
        pairsMeetingSoftTarget: number;
        status: string;
        byVegetable: Array<{ vegetableId: string; status: string }>;
      };
    };

    const vegA = { id: 'veg-a', name: 'Veg A' } as Vegetable;
    const vegB = { id: 'veg-b', name: 'Veg B' } as Vegetable;

    const templates = [
      { generationMode: ActionTemplateGenerationMode.AUTO },
      { generationMode: ActionTemplateGenerationMode.ROUTINE },
    ] as ActionTemplate[];

    const rules = [
      {
        id: 'r1',
        vegetable: vegA,
        trigger: ActionRuleTrigger.AFTER_SOWING_DAYS,
        applyIfStartMethod: ['DIRECT_SOW'],
      },
      {
        id: 'r2',
        vegetable: vegA,
        trigger: ActionRuleTrigger.AFTER_TRANSPLANT_DAYS,
        applyIfStartMethod: ['TRANSPLANT'],
      },
      {
        id: 'r3',
        vegetable: vegB,
        trigger: ActionRuleTrigger.AFTER_TRANSPLANT_DAYS,
        applyIfStartMethod: ['TRANSPLANT'],
      },
      {
        id: 'r4',
        vegetable: vegB,
        trigger: ActionRuleTrigger.ON_HARVEST_CONFIRMED,
        applyIfStartMethod: null,
      },
    ] as unknown as VegetableActionRule[];

    const em = {
      find: jest.fn((entity: unknown) => {
        if (entity === ActionTemplate) {
          return Promise.resolve(templates);
        }
        if (entity === Vegetable) {
          return Promise.resolve([vegA, vegB]);
        }
        if (entity === VegetableActionRule) {
          return Promise.resolve(rules);
        }
        return Promise.resolve([]);
      }),
      count: jest.fn().mockResolvedValue(rules.length),
    } as unknown as EntityManager;

    const service = new ActionAutomationService(em);

    const result = (await service.getCoverage()) as CoverageResult;

    expect(result.coverage.hardMinimumRulesPerStartMethod).toBe(1);
    expect(result.coverage.softTargetRulesPerStartMethod).toBe(2);
    expect(result.coverage.totalVegetables).toBe(2);
    expect(result.coverage.totalMethodPairs).toBe(6);
    expect(result.coverage.pairsMeetingHardMinimum).toBe(3);
    expect(result.coverage.pairsMeetingSoftTarget).toBe(0);
    expect(result.coverage.status).toBe('below_hard');

    const vegAEntry = result.coverage.byVegetable.find(
      (entry: { vegetableId: string }) => entry.vegetableId === 'veg-a',
    );
    const vegBEntry = result.coverage.byVegetable.find(
      (entry: { vegetableId: string }) => entry.vegetableId === 'veg-b',
    );

    expect(vegAEntry?.status).toBe('below_hard');
    expect(vegBEntry?.status).toBe('below_hard');
  });
});
