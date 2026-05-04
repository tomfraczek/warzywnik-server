import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';

const DIRECT_SOW_PATH = [
  PlantingStatus.NEW,
  PlantingStatus.IN_GROUND,
  PlantingStatus.READY_FOR_FINAL_HARVEST,
  PlantingStatus.HARVESTED,
  PlantingStatus.CLEARED,
] as const;

const TRANSPLANT_PATH = [
  PlantingStatus.NEW,
  PlantingStatus.SEEDLING_PREPARED,
  PlantingStatus.SEEDLING_READY_FOR_TRANSPLANT,
  PlantingStatus.IN_GROUND,
  PlantingStatus.READY_FOR_FINAL_HARVEST,
  PlantingStatus.HARVESTED,
  PlantingStatus.CLEARED,
] as const;

export const getLifecyclePath = (
  startMethod: PlantingStartMethod,
): readonly PlantingStatus[] => {
  return startMethod === PlantingStartMethod.DIRECT_SOW
    ? DIRECT_SOW_PATH
    : TRANSPLANT_PATH;
};

export const getAllowedStatusTransitions = (
  current: PlantingStatus,
  startMethod: PlantingStartMethod,
): PlantingStatus[] => {
  const path = getLifecyclePath(startMethod);
  const clearedStatus = path[path.length - 1];

  if (
    current === PlantingStatus.FAILED ||
    current === PlantingStatus.CANCELLED ||
    current === PlantingStatus.HARVESTED
  ) {
    return [clearedStatus];
  }

  if (current === PlantingStatus.CLEARED) {
    return [];
  }

  const index = path.indexOf(current);

  if (index < 0) {
    return [];
  }

  const next: PlantingStatus[] = path[index + 1] ? [path[index + 1]] : [];
  const previous: PlantingStatus[] = path[index - 1] ? [path[index - 1]] : [];

  const transplantFastForwardToInGround: PlantingStatus[] =
    startMethod === PlantingStartMethod.TRANSPLANT &&
    [
      PlantingStatus.NEW,
      PlantingStatus.SEEDLING_PREPARED,
      PlantingStatus.SEEDLING_READY_FOR_TRANSPLANT,
    ].includes(current)
      ? [PlantingStatus.IN_GROUND]
      : [];

  return [
    ...new Set<PlantingStatus>([
      ...next,
      ...previous,
      ...transplantFastForwardToInGround,
      PlantingStatus.FAILED,
      PlantingStatus.CANCELLED,
    ]),
  ];
};

export const isStatusAllowedForStartMethod = (
  status: PlantingStatus,
  startMethod: PlantingStartMethod,
): boolean => {
  if (
    status === PlantingStatus.FAILED ||
    status === PlantingStatus.CANCELLED ||
    status === PlantingStatus.CLEARED
  ) {
    return true;
  }

  return getLifecyclePath(startMethod).includes(status);
};

export const ACTIVE_PLANTING_STATUSES = [
  PlantingStatus.NEW,
  PlantingStatus.SEEDLING_PREPARED,
  PlantingStatus.SEEDLING_READY_FOR_TRANSPLANT,
  PlantingStatus.IN_GROUND,
  PlantingStatus.READY_FOR_FINAL_HARVEST,
] as const satisfies readonly PlantingStatus[];
