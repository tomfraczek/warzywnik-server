import { NotificationCenterService } from './notification-center.service';

describe('NotificationCenterService summary', () => {
  it('maps unread aggregate to summary flags', async () => {
    const execute = jest
      .fn()
      .mockResolvedValue([{ unreadCount: 3, maxPriorityRank: 4 }]);

    const service = new NotificationCenterService({
      getConnection: () => ({ execute }),
    } as never);

    const result = await service.summary({ id: 'user-1' } as never);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      unreadCount: 3,
      hasUnread: true,
      highestUnreadPriority: 'CRITICAL',
      hasHighPriorityUnread: true,
      hasCriticalUnread: true,
    });
  });

  it('returns neutral summary when there are no unread notifications', async () => {
    const service = new NotificationCenterService({
      getConnection: () => ({ execute: jest.fn().mockResolvedValue([]) }),
    } as never);

    const result = await service.summary({ id: 'user-1' } as never);

    expect(result).toEqual({
      unreadCount: 0,
      hasUnread: false,
      highestUnreadPriority: null,
      hasHighPriorityUnread: false,
      hasCriticalUnread: false,
    });
  });
});
