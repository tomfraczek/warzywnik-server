import { EntityManager } from '@mikro-orm/postgresql';
import { ActionAutomationService } from './action-automation.service';
import { ActionTask } from './action-task.entity';
import { Planting } from '../plantings/planting.entity';
import { ActionTaskStatus } from '../common/enums/action.enums';

describe('ActionAutomationService cleanup policy B', () => {
  it('cancels only stale tasks owned by the same planting', async () => {
    const em = {
      find: jest.fn(),
      nativeUpdate: jest.fn().mockResolvedValue(1),
    } as unknown as EntityManager;

    const service = new ActionAutomationService({} as EntityManager);

    const planting = {
      id: 'planting-1',
      bed: { id: 'bed-1', growingSpace: { id: 'space-1' } },
    } as unknown as Planting;

    const ownedBySourceKey = {
      id: 'task-owned-key',
      status: ActionTaskStatus.PENDING,
      sourceKey: 'planting-1:tpl-1:AFTER_SOWING_DAYS:2026-05-04',
      isManuallyRescheduled: false,
      isUserModified: false,
      planting: null,
      bed: { id: 'bed-1' },
      growingSpace: null,
    } as unknown as ActionTask;

    const ownedByPlantingRefNoKey = {
      id: 'task-owned-planting',
      status: ActionTaskStatus.PENDING,
      sourceKey: null,
      isManuallyRescheduled: false,
      isUserModified: false,
      planting: { id: 'planting-1' },
      bed: null,
      growingSpace: null,
    } as unknown as ActionTask;

    const otherPlantingSameBed = {
      id: 'task-other-planting',
      status: ActionTaskStatus.PENDING,
      sourceKey: 'planting-2:tpl-2:AFTER_SOWING_DAYS:2026-05-04',
      isManuallyRescheduled: false,
      isUserModified: false,
      planting: null,
      bed: { id: 'bed-1' },
      growingSpace: null,
    } as unknown as ActionTask;

    const desiredTask = {
      id: 'task-desired',
      status: ActionTaskStatus.PENDING,
      sourceKey: 'planting-1:tpl-3:AFTER_SOWING_DAYS:2026-05-04',
      isManuallyRescheduled: false,
      isUserModified: false,
      planting: null,
      bed: { id: 'bed-1' },
      growingSpace: null,
    } as unknown as ActionTask;

    const userModifiedOwnedTask = {
      id: 'task-owned-user-modified',
      status: ActionTaskStatus.PENDING,
      sourceKey: 'planting-1:tpl-4:AFTER_SOWING_DAYS:2026-05-04',
      isManuallyRescheduled: false,
      isUserModified: true,
      planting: null,
      bed: { id: 'bed-1' },
      growingSpace: null,
    } as unknown as ActionTask;

    (em.find as unknown as jest.Mock).mockResolvedValue([
      ownedBySourceKey,
      ownedByPlantingRefNoKey,
      otherPlantingSameBed,
      desiredTask,
      userModifiedOwnedTask,
    ]);

    const target = service as unknown as {
      cleanupStaleGeneratedTasksForPlanting: (params: {
        user: { id: string };
        planting: Planting;
        desired: Array<{
          sourceKey: string;
          ruleId: string;
          cycleIndex: number;
          dueAt: Date;
        }>;
        forceOverrideManual: boolean;
        em: EntityManager;
      }) => Promise<void>;
    };

    await target.cleanupStaleGeneratedTasksForPlanting({
      user: { id: 'user-1' },
      planting,
      desired: [
        {
          sourceKey: 'planting-1:tpl-3:AFTER_SOWING_DAYS:2026-05-04',
          ruleId: 'rule-3',
          cycleIndex: 0,
          dueAt: new Date('2026-05-04T07:00:00.000Z'),
        },
      ],
      forceOverrideManual: false,
      em,
    });

    expect(ownedBySourceKey.status).toBe(ActionTaskStatus.CANCELED);
    expect(ownedByPlantingRefNoKey.status).toBe(ActionTaskStatus.CANCELED);
    expect(otherPlantingSameBed.status).toBe(ActionTaskStatus.PENDING);
    expect(desiredTask.status).toBe(ActionTaskStatus.PENDING);
    expect(userModifiedOwnedTask.status).toBe(ActionTaskStatus.PENDING);

    const nativeUpdateCalls = (em.nativeUpdate as unknown as jest.Mock).mock
      .calls as unknown[][];

    expect(nativeUpdateCalls).toHaveLength(2);
    expect(nativeUpdateCalls[0]?.[1]).toEqual(
      expect.objectContaining({ actionTaskId: 'task-owned-key' }),
    );
    expect(nativeUpdateCalls[1]?.[1]).toEqual(
      expect.objectContaining({ actionTaskId: 'task-owned-planting' }),
    );
  });
});
