import { ActionTemplateType } from '../../common/enums/action.enums';
import { DecisionType } from './decision.types';

export const mapActionTemplateTypeToDecisionType = (
  type: ActionTemplateType | string | null | undefined,
): DecisionType | null => {
  if (!type) return null;

  const normalized = String(type).toLowerCase();

  switch (normalized) {
    case 'watering':
      return 'WATERING';
    case 'fertilization':
      return 'FERTILIZATION';
    case 'weeding':
      return 'WEEDING';
    case 'pest_control':
      return 'PEST_CHECK';
    case 'disease_control':
      return 'DISEASE_CHECK';
    case 'harvest':
      return 'HARVEST_CHECK';
    case 'monitoring':
      return 'GENERAL_MONITORING';
    default:
      return null;
  }
};

export const isSameDecisionType = (
  a: DecisionType | null | undefined,
  b: DecisionType | null | undefined,
): boolean => Boolean(a && b && a === b);
