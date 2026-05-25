import { NotificationCenterService } from './notification-center.service';

describe('NotificationCenterService read and unread filters', () => {
  it('filters unread list by readAt=null and dismissedAt=null', async () => {
    const findAndCount = jest.fn().mockResolvedValue([[], 0]);
    const service = new NotificationCenterService({ findAndCount } as never);

    await service.list({ id: 'user-1' } as never, {
      status: 'unread',
      page: 1,
      limit: 20,
    });

    expect(findAndCount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user: 'user-1',
        readAt: null,
        dismissedAt: null,
      }),
      expect.anything(),
    );
  });

  it('marks notification as read and persists readAt', async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const item = {
      id: 'n-1',
      type: 'WEATHER_STATUS_CHANGED',
      title: 'Zmiana pogody',
      body: 'Treść',
      routeTarget: 'WEATHER',
      priority: 'HIGH',
      payload: {},
      readAt: null,
      openedAt: null,
      dismissedAt: null,
      createdAt: new Date('2026-05-14T10:00:00.000Z'),
    };

    const service = new NotificationCenterService({
      findOne: jest.fn().mockResolvedValue(item),
      flush,
    } as never);

    const result = await service.markRead({ id: 'user-1' } as never, 'n-1');

    expect(item.readAt).toBeInstanceOf(Date);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(result.readAt).toBeInstanceOf(Date);
  });

  it('removes read notifications older than 24h', async () => {
    const nativeDelete = jest.fn().mockResolvedValue(7);
    const service = new NotificationCenterService({ nativeDelete } as never);

    await service.cleanupReadNotificationsAfter24h();

    expect(nativeDelete).toHaveBeenCalledTimes(1);
    expect(nativeDelete).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        readAt: {
          $lt: expect.any(Date) as unknown,
        },
      }),
    );
  });
});
