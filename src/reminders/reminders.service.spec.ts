import { EntityManager } from '@mikro-orm/postgresql';
import { RemindersService } from './reminders.service';
import { PlantingDiseaseStatus } from '../common/enums/planting-disease.enums';
import { PestOccurrenceStatus } from '../common/enums/pest-occurrence.enums';

describe('RemindersService (unit)', () => {
  let service: RemindersService;

  beforeEach(() => {
    service = new RemindersService({} as EntityManager);
  });

  it('computes next check for suspected as +24h from base time', () => {
    const base = new Date('2026-02-20T10:00:00.000Z');

    const next = (service as any).computeNextCheckAt(
      PlantingDiseaseStatus.SUSPECTED,
      base,
    ) as Date;

    expect(next.getTime()).toBe(base.getTime() + 24 * 60 * 60 * 1000);
  });

  it('computes next check for confirmed as +48h from base time', () => {
    const base = new Date('2026-02-20T10:00:00.000Z');

    const next = (service as any).computeNextCheckAt(
      PestOccurrenceStatus.CONFIRMED,
      base,
    ) as Date;

    expect(next.getTime()).toBe(base.getTime() + 48 * 60 * 60 * 1000);
  });

  it('returns reminder limits: suspected=3, confirmed=2', () => {
    const suspectedLimit = (service as any).getMaxReminders(
      PlantingDiseaseStatus.SUSPECTED,
    ) as number;
    const confirmedLimit = (service as any).getMaxReminders(
      PestOccurrenceStatus.CONFIRMED,
    ) as number;

    expect(suspectedLimit).toBe(3);
    expect(confirmedLimit).toBe(2);
  });
});
