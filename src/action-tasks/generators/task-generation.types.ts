import { Planting } from '../../plantings/planting.entity';
import { VegetableActionRule } from '../../vegetables/vegetable-action-rule.entity';

export type GeneratedTaskCandidate = {
  kind: 'LIFECYCLE' | 'ROUTINE' | 'RULE';
  trigger: string;
  dueAt: Date;
  cycleIndex: number;
  rule: VegetableActionRule;
  sourceKey: string;
};

export type GeneratorContext = {
  planting: Planting;
  rules: VegetableActionRule[];
};
