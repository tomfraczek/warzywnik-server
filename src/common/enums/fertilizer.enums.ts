export enum FertilizerCategory {
  ORGANIC = 'ORGANIC',
  MINERAL = 'MINERAL',
  BIO_STIMULANT = 'BIO_STIMULANT',
  SOIL_AMENDMENT = 'SOIL_AMENDMENT',
  PH_ADJUSTER = 'PH_ADJUSTER',
}

export enum FertilizerForm {
  SOLID = 'SOLID',
  LIQUID = 'LIQUID',
}

export enum ApplicationMethod {
  TOP_DRESS = 'TOP_DRESS',
  INCORPORATE = 'INCORPORATE',
  WATERING = 'WATERING',
  FOLIAR = 'FOLIAR',
  COMPOST_TEA = 'COMPOST_TEA',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum NutrientEffect {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VARIABLE = 'VARIABLE',
}

export enum PhEffect {
  LOWERS = 'LOWERS',
  RAISES = 'RAISES',
  NEUTRAL = 'NEUTRAL',
  VARIABLE = 'VARIABLE',
}

export enum SoilStructureEffect {
  IMPROVES = 'IMPROVES',
  NEUTRAL = 'NEUTRAL',
  MAY_WORSEN = 'MAY_WORSEN',
}

export enum EffectLevel {
  DECREASES = 'DECREASES',
  NEUTRAL = 'NEUTRAL',
  INCREASES = 'INCREASES',
}

export enum RecommendedFrequency {
  ONE_TIME = 'ONE_TIME',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  SEASONAL = 'SEASONAL',
  AS_NEEDED = 'AS_NEEDED',
}
