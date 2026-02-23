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
  ON_SOWED = 'ON_SOWED',
  AFTER_SOWING_DAYS = 'AFTER_SOWING_DAYS',
  ON_TRANSPLANTED = 'ON_TRANSPLANTED',
  AFTER_TRANSPLANT_DAYS = 'AFTER_TRANSPLANT_DAYS',
  BEFORE_TRANSPLANT_DAYS = 'BEFORE_TRANSPLANT_DAYS',
  ON_HARVEST_WINDOW_START = 'ON_HARVEST_WINDOW_START',
  BEFORE_HARVEST_WINDOW_START_DAYS = 'BEFORE_HARVEST_WINDOW_START_DAYS',
  ON_HARVEST_CONFIRMED = 'ON_HARVEST_CONFIRMED',
  AFTER_HARVEST_DAYS = 'AFTER_HARVEST_DAYS',
}

export enum ActionRuleSchedule {
  ONCE = 'ONCE',
  EVERY_N_DAYS = 'EVERY_N_DAYS',
}
