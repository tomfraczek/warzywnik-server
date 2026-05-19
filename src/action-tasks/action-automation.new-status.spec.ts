import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';
import { PlantingStatus } from '../common/enums/planting.enums';

describe('ActionAutomationService NEW status behavior', () => {
  it('does not generate operational tasks for NEW planting', async () => {
    const planting = {
      id: 'planting-1',
      status: PlantingStatus.NEW,
      appliedRulesVersion: 1,
      vegetable: { id: 'veg-1', rulesVersion: 1, name: 'Pomidor' },
      bed: { id: 'bed-1', growingSpace: { id: 'space-1' } },
      timelineTimezone: 'Europe/Warsaw',
    };

    const txEm = {
      findOne: jest.fn().mockResolvedValue(planting),
      find: jest.fn().mockResolvedValue([]),
      flush: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    const em = {
      transactional: jest
        .fn()
        .mockImplementation((cb: (manager: EntityManager) => unknown) =>
          cb(txEm),
        ),
    } as unknown as EntityManager;

    const service = new ActionAutomationService(em);

    const resetSpy = jest
      .spyOn(
        service as unknown as {
          resetGeneratedTasksForPlanting: (arg: unknown) => Promise<void>;
        },
        'resetGeneratedTasksForPlanting',
      )
      .mockResolvedValue(undefined);

    const upsertSpy = jest
      .spyOn(
        service as unknown as {
          upsertGeneratedTaskAndReminder: (arg: unknown) => Promise<void>;
        },
        'upsertGeneratedTaskAndReminder',
      )
      .mockResolvedValue(undefined);

    const result = await service.recomputeForPlanting({
      user: { id: 'user-1', automaticTasksEnabled: true } as never,
      plantingId: 'planting-1',
      reason: 'TEST',
    });

    expect(result.desiredCount).toBe(0);
    expect(resetSpy).toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
