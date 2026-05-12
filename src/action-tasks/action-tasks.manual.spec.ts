/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActionTaskSource,
  ActionTaskSourceType,
  ActionTaskStatus,
  ActionTaskTargetType,
  ActionTemplateTarget,
} from '../common/enums/action.enums';
import { ActionTasksService } from './action-tasks.service';

describe('ActionTasksService manual tasks', () => {
  const user = { id: 'user-1' } as never;

  it('rejects manual task creation when template is not user selectable', async () => {
    const em = {
      transactional: jest.fn(
        async (cb: (tx: EntityManager) => Promise<unknown>) =>
          cb(em as unknown as EntityManager),
      ),
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'planting-1',
          user: { id: 'user-1' },
          bed: { id: 'bed-1' },
        })
        .mockResolvedValueOnce({
          id: 'tpl-1',
          target: ActionTemplateTarget.PLANTING,
          isUserSelectable: false,
        }),
    } as unknown as EntityManager;

    const service = new ActionTasksService(
      em,
      { upsertPendingForActionTask: jest.fn() } as never,
      { recordEvent: jest.fn() } as never,
    );

    await expect(
      service.createForPlanting(user, 'planting-1', {
        actionTemplateId: 'tpl-1',
        dueAt: '2026-05-11T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates single bed manual task with manual metadata', async () => {
    const persisted: Array<Record<string, unknown>> = [];

    const em = {
      transactional: jest.fn(
        async (cb: (tx: EntityManager) => Promise<unknown>) =>
          cb(em as unknown as EntityManager),
      ),
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 'bed-1', user: { id: 'user-1' } })
        .mockResolvedValueOnce({
          id: 'tpl-1',
          name: 'Dosadzanie roślin',
          description: 'desc',
          target: ActionTemplateTarget.BED,
          isUserSelectable: true,
          type: 'manual_custom',
          defaultDueOffsetDays: 0,
        }),
      persist: jest.fn((entity: Record<string, unknown>) => {
        entity.id = entity.id ?? 'task-1';
        entity.createdAt = entity.createdAt ?? new Date();
        entity.updatedAt = entity.updatedAt ?? new Date();
        persisted.push(entity);
      }),
      flush: jest.fn(),
      populate: jest.fn(),
    } as unknown as EntityManager;

    const remindersService = { upsertPendingForActionTask: jest.fn() };

    const service: ActionTasksService = new ActionTasksService(
      em,
      remindersService as never,
      { recordEvent: jest.fn() } as never,
    );

    const result = await service.createForBed(user, 'bed-1', {
      actionTemplateId: 'tpl-1',
      dueAt: '2026-05-11T09:00:00.000Z',
      description: 'manual desc',
    });

    expect(result.targetType).toBe(ActionTaskTargetType.BED);
    expect(result.source).toBe(ActionTaskSource.MANUAL);
    expect(result.sourceType).toBe(ActionTaskSourceType.MANUAL);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        manual: true,
        targetType: ActionTaskTargetType.BED,
        actionTemplateId: 'tpl-1',
      }),
    );

    expect(remindersService.upsertPendingForActionTask).toHaveBeenCalledTimes(
      1,
    );
    expect(persisted[0]?.planting).toBeNull();
  });

  it('allows manual task creation when automaticTasksEnabled=false', async () => {
    const em = {
      transactional: jest.fn(
        async (cb: (tx: EntityManager) => Promise<unknown>) =>
          cb(em as unknown as EntityManager),
      ),
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 'bed-1', user: { id: 'user-1' } })
        .mockResolvedValueOnce({
          id: 'tpl-1',
          name: 'Dosadzanie roślin',
          description: null,
          target: ActionTemplateTarget.BED,
          isUserSelectable: true,
          type: 'manual_custom',
          defaultDueOffsetDays: 0,
        }),
      persist: jest.fn((entity: Record<string, unknown>) => {
        entity.id = 'task-1';
        entity.createdAt = new Date();
        entity.updatedAt = new Date();
      }),
      flush: jest.fn(),
      populate: jest.fn(),
    } as unknown as EntityManager;

    const service: ActionTasksService = new ActionTasksService(
      em,
      { upsertPendingForActionTask: jest.fn() } as never,
      { recordEvent: jest.fn() } as never,
    );

    const result = await service.createForBed(
      { id: 'user-1', automaticTasksEnabled: false } as never,
      'bed-1',
      {
        actionTemplateId: 'tpl-1',
        dueAt: '2026-05-11T09:00:00.000Z',
      },
    );

    expect(result.source).toBe(ActionTaskSource.MANUAL);
    expect(result.targetType).toBe(ActionTaskTargetType.BED);
  });

  it('rejects bed manual task creation when template target mismatches', async () => {
    const em = {
      transactional: jest.fn(
        async (cb: (tx: EntityManager) => Promise<unknown>) =>
          cb(em as unknown as EntityManager),
      ),
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 'bed-1', user: { id: 'user-1' } })
        .mockResolvedValueOnce({
          id: 'tpl-1',
          target: ActionTemplateTarget.PLANTING,
          isUserSelectable: true,
        }),
    } as unknown as EntityManager;

    const service: ActionTasksService = new ActionTasksService(
      em,
      { upsertPendingForActionTask: jest.fn() } as never,
      { recordEvent: jest.fn() } as never,
    );

    await expect(
      service.createForBed(user, 'bed-1', {
        actionTemplateId: 'tpl-1',
        dueAt: '2026-05-11T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records planting timeline event for manual task completion with extended payload', async () => {
    const task = {
      id: 'task-1',
      user: { id: 'user-1' },
      status: ActionTaskStatus.PENDING,
      source: ActionTaskSource.MANUAL,
      sourceType: ActionTaskSourceType.MANUAL,
      targetType: ActionTaskTargetType.PLANTING,
      planting: {
        id: 'planting-1',
        bed: { id: 'bed-1' },
        vegetable: { id: 'veg-1' },
      },
      bed: { id: 'bed-1', name: 'A' },
      actionTemplate: { id: 'tpl-1', type: 'watering' },
      metadata: {},
      title: 'Podlej',
      description: 'opis',
      dueAt: new Date('2026-05-11T09:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never;

    const em = {
      transactional: jest.fn(
        async (cb: (tx: EntityManager) => Promise<unknown>) =>
          cb(em as unknown as EntityManager),
      ),
      findOne: jest.fn().mockResolvedValue(task),
      populate: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager;

    const plantingInsightsService = { recordEvent: jest.fn() };

    const service = new ActionTasksService(
      em,
      {
        cancelPendingForActionTask: jest.fn(),
        upsertPendingForActionTask: jest.fn(),
      } as never,
      plantingInsightsService as never,
    );

    await service.patch(user, 'task-1', {
      status: ActionTaskStatus.DONE,
    });

    expect(plantingInsightsService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        plantingId: 'planting-1',
        payload: expect.objectContaining({
          taskId: 'task-1',
          actionTemplateId: 'tpl-1',
          targetType: ActionTaskTargetType.PLANTING,
          source: ActionTaskSource.MANUAL,
          description: 'opis',
        }),
      }),
    );
  });

  it('physically deletes manual task on remove', async () => {
    const task = {
      id: 'task-1',
      source: ActionTaskSource.MANUAL,
      user: { id: 'user-1' },
    } as never;

    const em = {
      transactional: jest.fn(
        async (cb: (tx: EntityManager) => Promise<unknown>) =>
          cb(em as unknown as EntityManager),
      ),
      findOne: jest.fn().mockResolvedValue(task),
      removeAndFlush: jest.fn(),
      flush: jest.fn(),
    } as unknown as EntityManager;

    const service = new ActionTasksService(
      em,
      {
        cancelPendingForActionTask: jest.fn(),
      } as never,
      { recordEvent: jest.fn() } as never,
    );

    await service.remove(user, 'task-1');

    expect((em.removeAndFlush as unknown as jest.Mock).mock.calls.length).toBe(
      1,
    );
  });
});
