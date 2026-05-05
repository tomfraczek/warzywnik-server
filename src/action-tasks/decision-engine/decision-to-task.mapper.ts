import { ActionTemplate } from '../../action-templates/action-template.entity';
import {
  ActionTemplateTarget,
  ActionTemplateType,
} from '../../common/enums/action.enums';
import { DecisionCandidate, DecisionType } from './decision.types';

const preferredTemplateTypeByDecision: Record<
  DecisionType,
  ActionTemplateType
> = {
  WATERING: ActionTemplateType.WATERING,
  MOISTURE_CHECK: ActionTemplateType.MONITORING,
  PEST_CHECK: ActionTemplateType.PEST_CONTROL,
  DISEASE_CHECK: ActionTemplateType.DISEASE_CONTROL,
  WEEDING: ActionTemplateType.WEEDING,
  FERTILIZATION: ActionTemplateType.FERTILIZATION,
  HARVEST_CHECK: ActionTemplateType.HARVEST,
  FROST_PROTECTION: ActionTemplateType.PHYSICAL_PROTECTION,
  GENERAL_MONITORING: ActionTemplateType.MONITORING,
};

export class DecisionToTaskMapper {
  pickTemplate(
    candidate: DecisionCandidate,
    templates: ActionTemplate[],
  ): ActionTemplate | null {
    const bySlug = templates.find(
      (template) => template.slug === candidate.actionTemplateSlug,
    );
    if (bySlug) {
      return bySlug;
    }

    const preferredType =
      preferredTemplateTypeByDecision[candidate.decisionType];

    const byTypeAndTarget = templates.find(
      (template) =>
        template.type === preferredType &&
        template.target === ActionTemplateTarget.PLANTING,
    );
    if (byTypeAndTarget) {
      return byTypeAndTarget;
    }

    const byType = templates.find(
      (template) => template.type === preferredType,
    );
    if (byType) {
      return byType;
    }

    return (
      templates.find(
        (template) => template.target === ActionTemplateTarget.PLANTING,
      ) ?? null
    );
  }
}
