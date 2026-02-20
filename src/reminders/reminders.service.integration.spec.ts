import { EntityManager } from '@mikro-orm/postgresql';
import { RemindersService } from './reminders.service';
import { Reminder } from './reminder.entity';
import { ReminderStatus } from '../common/enums/reminder.enums';
import { PlantingDiseaseStatus } from '../common/enums/planting-disease.enums';
import { PestOccurrenceStatus } from '../common/enums/pest-occurrence.enums';
import { PlantingDisease } from '../planting-diseases/planting-disease.entity';
import { PestOccurrence } from '../pest-occurrences/pest-occurrence.entity';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Disease } from '../diseases/disease.entity';
import { Pest } from '../pests/pest.entity';

type EmMock = {
  findOne: jest.Mock;
  nativeUpdate: jest.Mock;
  persist: jest.Mock;
  flush: jest.Mock;
  transactional: jest.Mock;
};

const createEntityManagerMock = (): EmMock => {
  const em: EmMock = {
    findOne: jest.fn(),
    nativeUpdate: jest.fn().mockResolvedValue(0),
    persist: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    transactional: jest.fn(),
  };

  em.transactional.mockImplementation(
    async (cb: (trx: EntityManager) => Promise<void>) =>
      cb(em as unknown as EntityManager),
  );

  return em;
};

describe('RemindersService (integration-like)', () => {
  let em: EmMock;
  let service: RemindersService;

  beforeEach(() => {
    em = createEntityManagerMock();
    service = new RemindersService(em as unknown as EntityManager);
    jest.useFakeTimers().setSystemTime(new Date('2026-02-20T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('create occurrence schedules exactly 1 pending reminder and sets nextCheckAt', async () => {
    const user = { id: 'user-1' } as unknown as User;
    const planting = { id: 'planting-1', user } as unknown as Planting;
    const disease = { id: 'disease-1' } as unknown as Disease;
    const occurrence = {
      id: 'pd-1',
      status: PlantingDiseaseStatus.SUSPECTED,
      reminderCount: 0,
      nextCheckAt: null,
    } as unknown as PlantingDisease;

    await service.createForPlantingDisease({
      user,
      planting,
      disease,
      plantingDisease: occurrence,
    });

    expect(occurrence.nextCheckAt).toBeInstanceOf(Date);
    expect(occurrence.reminderCount).toBe(0);
    expect(em.nativeUpdate).toHaveBeenCalledTimes(1);
    expect(em.persist).toHaveBeenCalledTimes(1);

    const firstPersistCall = em.persist.mock.calls[0] as [Reminder];
    const reminder = firstPersistCall[0];
    expect(reminder.status).toBe(ReminderStatus.PENDING);
    expect(reminder.plantingDiseaseId).toBe(occurrence.id);
    expect(reminder.scheduledAt.getTime()).toBe(
      occurrence.nextCheckAt!.getTime(),
    );
  });

  it('after sent reminder schedules next from previous scheduledAt (no drift)', async () => {
    const baseScheduledAt = new Date('2026-02-10T08:00:00.000Z');
    const reminder = {
      id: 'rem-1',
      scheduledAt: baseScheduledAt,
      plantingDiseaseId: 'pd-2',
      pestOccurrenceId: null,
    } as unknown as Reminder;

    const user = { id: 'user-2' } as unknown as User;
    const planting = { id: 'planting-2', user } as unknown as Planting;
    const disease = { id: 'disease-2' } as unknown as Disease;

    const occurrence = {
      id: 'pd-2',
      status: PlantingDiseaseStatus.SUSPECTED,
      reminderCount: 0,
      nextCheckAt: null,
      planting,
      disease,
    } as unknown as PlantingDisease;

    em.findOne.mockImplementation(
      (entity: unknown, where: Record<string, unknown>) => {
        if (entity === Reminder && where.id === reminder.id) {
          return Promise.resolve(reminder);
        }
        if (entity === PlantingDisease && where.id === occurrence.id) {
          return Promise.resolve(occurrence);
        }
        return Promise.resolve(null);
      },
    );

    await service.handlePlantingDiseaseReminderSent({
      reminderId: reminder.id,
    });

    const expected = new Date(baseScheduledAt.getTime() + 24 * 60 * 60 * 1000);

    expect(occurrence.reminderCount).toBe(1);
    expect(occurrence.nextCheckAt?.getTime()).toBe(expected.getTime());
    expect(em.persist).toHaveBeenCalledTimes(1);

    const firstPersistCall = em.persist.mock.calls[0] as [Reminder];
    const nextReminder = firstPersistCall[0];
    expect(nextReminder.scheduledAt.getTime()).toBe(expected.getTime());
  });

  it('status change to resolved cancels pending/processing and clears nextCheckAt', async () => {
    const user = { id: 'user-3' } as unknown as User;
    const planting = { id: 'planting-3', user } as unknown as Planting;
    const pest = { id: 'pest-3' } as unknown as Pest;

    const occurrence = {
      id: 'po-3',
      status: PestOccurrenceStatus.RESOLVED,
      reminderCount: 2,
      nextCheckAt: new Date('2026-02-22T12:00:00.000Z'),
    } as unknown as PestOccurrence;

    await service.updateForPestOccurrenceStatusChange({
      user,
      planting,
      pest,
      pestOccurrence: occurrence,
      previousStatus: PestOccurrenceStatus.SUSPECTED,
    });

    expect(occurrence.nextCheckAt).toBeNull();
    expect(occurrence.reminderCount).toBe(0);
    expect(em.persist).not.toHaveBeenCalled();
    expect(em.nativeUpdate).toHaveBeenCalledTimes(1);

    const [, where] = em.nativeUpdate.mock.calls[0] as [
      unknown,
      { status: { $in: ReminderStatus[] } },
    ];
    expect(where.status.$in).toEqual([
      ReminderStatus.PENDING,
      ReminderStatus.PROCESSING,
    ]);
  });

  it('reschedule path does cancel-all then create one pending reminder (no duplicates)', async () => {
    const user = { id: 'user-4' } as unknown as User;
    const planting = { id: 'planting-4', user } as unknown as Planting;
    const disease = { id: 'disease-4' } as unknown as Disease;

    const occurrence = {
      id: 'pd-4',
      status: PlantingDiseaseStatus.CONFIRMED,
      reminderCount: 7,
      nextCheckAt: new Date('2026-02-21T12:00:00.000Z'),
    } as unknown as PlantingDisease;

    await service.updateForPlantingDiseaseStatusChange({
      user,
      planting,
      disease,
      plantingDisease: occurrence,
      previousStatus: PlantingDiseaseStatus.SUSPECTED,
    });

    expect(occurrence.reminderCount).toBe(0);
    expect(em.nativeUpdate).toHaveBeenCalledTimes(1);
    expect(em.persist).toHaveBeenCalledTimes(1);

    const cancelCallOrder = em.nativeUpdate.mock.invocationCallOrder[0];
    const createCallOrder = em.persist.mock.invocationCallOrder[0];
    expect(cancelCallOrder).toBeLessThan(createCallOrder);
  });
});
