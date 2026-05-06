export enum BedQuickActionKind {
  WATERING = 'WATERING',
  WEEDING = 'WEEDING',
  MOISTURE_CHECK = 'MOISTURE_CHECK',
  NOTE = 'NOTE',
}

export enum PlantingQuickActionKind {
  NOTE = 'NOTE',
}

export enum QuickActionScope {
  BED = 'bed',
  PLANTING = 'planting',
}

export enum QuickActionMoistureLevel {
  DRY = 'dry',
  OK = 'ok',
  WET = 'wet',
}

export const mapQuickActionKindToDecisionType = (
  actionKind: string,
): 'WATERING' | 'WEEDING' | 'MOISTURE_CHECK' | null => {
  switch (actionKind) {
    case 'WATERING':
      return 'WATERING';
    case 'WEEDING':
      return 'WEEDING';
    case 'MOISTURE_CHECK':
      return 'MOISTURE_CHECK';
    default:
      return null;
  }
};

export const mapQuickActionKindToActionType = (
  actionKind: string,
): string | null => {
  switch (actionKind) {
    case 'WATERING':
      return 'watering';
    case 'WEEDING':
      return 'weeding';
    case 'MOISTURE_CHECK':
      return 'monitoring';
    default:
      return null;
  }
};
