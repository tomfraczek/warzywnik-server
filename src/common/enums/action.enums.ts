export enum ActionTemplateTarget {
  BED = 'bed',
  PLANTING = 'planting',
}

export enum ActionTemplateType {
  WATER = 'WATER',
  SPRAY = 'SPRAY',
  FERTILIZE = 'FERTILIZE',
  WEED = 'WEED',
  HARVEST = 'HARVEST',
  SOIL_PREP = 'SOIL_PREP',
  OTHER = 'OTHER',
}

export enum ActionTaskTargetType {
  BED = 'bed',
  PLANTING = 'planting',
}

export enum ActionTaskStatus {
  PENDING = 'pending',
  DONE = 'done',
  CANCELED = 'canceled',
}

export enum ActionTaskSource {
  MANUAL = 'MANUAL',
  VEGETABLE_RULE = 'VEGETABLE_RULE',
}

export enum ActionRuleTrigger {
  ON_PLANTING_CREATED = 'ON_PLANTING_CREATED',
  ON_HARVEST_CONFIRMED = 'ON_HARVEST_CONFIRMED',
}
