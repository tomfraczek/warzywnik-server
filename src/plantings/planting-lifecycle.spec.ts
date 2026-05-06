import {
  getAllowedStatusTransitions,
  getLifecyclePath,
} from './planting-lifecycle';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';

describe('planting lifecycle transitions', () => {
  it('allows rollback from HARVESTED to READY_FOR_FINAL_HARVEST (direct sow)', () => {
    const allowed = getAllowedStatusTransitions(
      PlantingStatus.HARVESTED,
      PlantingStartMethod.DIRECT_SOW,
    );

    expect(allowed).toContain(PlantingStatus.READY_FOR_FINAL_HARVEST);
    expect(allowed).toContain(PlantingStatus.CLEARED);
  });

  it('allows rollback from HARVESTED to READY_FOR_FINAL_HARVEST (transplant)', () => {
    const allowed = getAllowedStatusTransitions(
      PlantingStatus.HARVESTED,
      PlantingStartMethod.TRANSPLANT,
    );

    expect(allowed).toContain(PlantingStatus.READY_FOR_FINAL_HARVEST);
    expect(allowed).toContain(PlantingStatus.CLEARED);
  });

  it('allows rollback from CLEARED to HARVESTED for both lifecycle paths', () => {
    const directSow = getAllowedStatusTransitions(
      PlantingStatus.CLEARED,
      PlantingStartMethod.DIRECT_SOW,
    );
    const transplant = getAllowedStatusTransitions(
      PlantingStatus.CLEARED,
      PlantingStartMethod.TRANSPLANT,
    );

    expect(directSow).toEqual([PlantingStatus.HARVESTED]);
    expect(transplant).toEqual([PlantingStatus.HARVESTED]);
  });

  it('keeps FAILED and CANCELLED behavior unchanged (can move to CLEARED)', () => {
    const directSowPath = getLifecyclePath(PlantingStartMethod.DIRECT_SOW);
    const transplantPath = getLifecyclePath(PlantingStartMethod.TRANSPLANT);

    expect(
      getAllowedStatusTransitions(
        PlantingStatus.FAILED,
        PlantingStartMethod.DIRECT_SOW,
      ),
    ).toEqual([directSowPath[directSowPath.length - 1]]);

    expect(
      getAllowedStatusTransitions(
        PlantingStatus.CANCELLED,
        PlantingStartMethod.TRANSPLANT,
      ),
    ).toEqual([transplantPath[transplantPath.length - 1]]);
  });
});
