import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';

describe('ActionAutomationService automaticTasksEnabled flag', () => {
  it('skips recomputeForPlanting when user automatic tasks are disabled', async () => {
    const em = {
      transactional: jest.fn(
        async (cb: (tx: EntityManager) => Promise<unknown>) =>
          cb(em as unknown as EntityManager),
      ),
      findOne: jest.fn().mockResolvedValue({
        id: 'planting-1',
        user: { id: 'user-1' },
        bed: { id: 'bed-1', growingSpace: { id: 'space-1' } },
        vegetable: { id: 'veg-1', rulesVersion: 1 },
      }),
      find: jest.fn(),
      flush: jest.fn(),
    } as unknown as EntityManager;

    const service = new ActionAutomationService(em);

    const result = await service.recomputeForPlanting({
      user: { id: 'user-1', automaticTasksEnabled: false } as never,
      plantingId: 'planting-1',
      reason: 'MANUAL_RECOMPUTE',
    });

    expect(result).toEqual(
      expect.objectContaining({
        plantingId: 'planting-1',
        desiredCount: 0,
        skipped: true,
        automaticTasksEnabled: false,
      }),
    );

    expect((em.find as unknown as jest.Mock).mock.calls).toHaveLength(0);
  });
});
