export enum ActionTemplateTarget {
  BED = 'bed',
  PLANTING = 'planting',
  SPACE = 'space',
}

export enum ActionTemplateEnvironment {
  ANY = 'any',
  OUTDOOR = 'outdoor',
  TUNNEL = 'tunnel',
  GREENHOUSE = 'greenhouse',
}

export enum ActionTemplateType {
  SOWING = 'sowing',
  TRANSPLANTING = 'transplanting',
  THINNING = 'thinning',
  HARDENING = 'hardening',
  WATERING = 'watering',
  FERTILIZATION = 'fertilization',
  PRUNING = 'pruning',
  WEEDING = 'weeding',
  STAKING = 'staking',
  HARVEST = 'harvest',
  PEST_CONTROL = 'pest_control',
  DISEASE_CONTROL = 'disease_control',
  SPRAYING = 'spraying',
  PHYSICAL_PROTECTION = 'physical_protection',
  TRAP_SETUP = 'trap_setup',
  SOIL_PREPARATION = 'soil_preparation',
  SOIL_AMENDMENT = 'soil_amendment',
  MULCHING = 'mulching',
  SOIL_TESTING = 'soil_testing',
  SOIL_REGENERATION = 'soil_regeneration',
  IRRIGATION_SETUP = 'irrigation_setup',
  MONITORING = 'monitoring',
  ROTATION_PLANNING = 'rotation_planning',
  BED_READY = 'bed_ready',
  CLIMATE_CONTROL = 'climate_control',
  VENTILATION = 'ventilation',
  HUMIDITY_REDUCTION = 'humidity_reduction',
  SHADING = 'shading',
  STRUCTURE_INSPECTION = 'structure_inspection',
  STRUCTURE_REPAIR = 'structure_repair',
  SPACE_HYGIENE = 'space_hygiene',
  SEASONAL_PREPARATION = 'seasonal_preparation',
  MANUAL_CUSTOM = 'manual_custom',
}

export enum ActionTaskTargetType {
  USER = 'user',
  BED = 'bed',
  PLANTING = 'planting',
  SPACE = 'space',
}

export enum ActionTaskStatus {
  PENDING = 'pending',
  DONE = 'done',
  CANCELED = 'canceled',
}

export enum ActionTaskSource {
  MANUAL = 'MANUAL',
  VEGETABLE_RULE = 'VEGETABLE_RULE',
  WEATHER_WARNING = 'WEATHER_WARNING',
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
