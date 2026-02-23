import { EntityManager } from '@mikro-orm/postgresql';
import { RemindersService } from './reminders.service';
import { PlantingDiseaseStatus } from '../common/enums/planting-disease.enums';
import { PestOccurrenceStatus } from '../common/enums/pest-occurrence.enums';

describe('RemindersService (unit)', () => {
  let service: RemindersService;
  type RemindersServiceTestAccess = {
    computeNextCheckAt: (
      status: PlantingDiseaseStatus | PestOccurrenceStatus,
      base?: Date,
    ) => Date;
    getMaxReminders: (
      status: PlantingDiseaseStatus | PestOccurrenceStatus,
    ) => number;
  };

  beforeEach(() => {
    service = new RemindersService({} as EntityManager);
  });

  it('computes next check for suspected as +24h from base time', () => {
    const base = new Date('2026-02-20T10:00:00.000Z');
    const access = service as unknown as RemindersServiceTestAccess;

    const next = access.computeNextCheckAt(
      PlantingDiseaseStatus.SUSPECTED,
      base,
    );

    expect(next.getTime()).toBe(base.getTime() + 24 * 60 * 60 * 1000);
  });

  it('computes next check for confirmed as +48h from base time', () => {
    const base = new Date('2026-02-20T10:00:00.000Z');
    const access = service as unknown as RemindersServiceTestAccess;

    const next = access.computeNextCheckAt(
      PestOccurrenceStatus.CONFIRMED,
      base,
    );

    expect(next.getTime()).toBe(base.getTime() + 48 * 60 * 60 * 1000);
  });

  it('returns reminder limits: suspected=3, confirmed=2', () => {
    const access = service as unknown as RemindersServiceTestAccess;
    const suspectedLimit = access.getMaxReminders(
      PlantingDiseaseStatus.SUSPECTED,
    );
    const confirmedLimit = access.getMaxReminders(
      PestOccurrenceStatus.CONFIRMED,
    );

    expect(suspectedLimit).toBe(3);
    expect(confirmedLimit).toBe(2);
  });
});
