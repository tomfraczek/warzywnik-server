import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Notification } from './entities/notification.entity';
import { User } from '../users/user.entity';
import {
  NotificationPriority,
  NotificationRouteTarget,
  NotificationType,
} from '../common/enums/notification.enums';
import { ListNotificationsQueryDto } from './dto/notifications.schemas';
import { NotificationSummaryResponse } from './notification.types';

@Injectable()
export class NotificationCenterService {
  constructor(private readonly em: EntityManager) {}

  async createNotification(params: {
    user: User;
    type: NotificationType;
    routeTarget: NotificationRouteTarget;
    title: string;
    body: string;
    payload: Record<string, unknown>;
    priority: NotificationPriority;
  }): Promise<Notification> {
    const item = new Notification();
    item.user = params.user;
    item.type = params.type;
    item.routeTarget = params.routeTarget;
    item.title = params.title;
    item.body = params.body;
    item.payload = params.payload;
    item.priority = params.priority;

    this.em.persist(item);
    await this.em.flush();
    return item;
  }

  async list(user: User, query: ListNotificationsQueryDto) {
    const where: Record<string, unknown> = { user: user.id };

    if (query.status === 'unread') {
      where.readAt = null;
      where.dismissedAt = null;
    }

    if (query.status === 'read') {
      where.readAt = { $ne: null };
    }

    const [items, total] = await this.em.findAndCount(Notification, where, {
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      orderBy: [{ createdAt: 'desc' }],
    });

    return {
      items: items.map((item) => this.serialize(item)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async markRead(user: User, id: string) {
    const item = await this.getOwnedOrThrow(user.id, id);
    item.readAt = item.readAt ?? new Date();
    await this.em.flush();
    return this.serialize(item);
  }

  async markAllRead(user: User) {
    await this.em.nativeUpdate(
      Notification,
      { user: user.id, readAt: null },
      { readAt: new Date() },
    );

    return { ok: true };
  }

  async markOpened(user: User, id: string) {
    const item = await this.getOwnedOrThrow(user.id, id);
    item.openedAt = new Date();
    item.readAt = item.readAt ?? new Date();
    await this.em.flush();
    return this.serialize(item);
  }

  async dismiss(user: User, id: string) {
    const item = await this.getOwnedOrThrow(user.id, id);
    item.dismissedAt = new Date();
    await this.em.flush();
    return this.serialize(item);
  }

  async summary(user: User): Promise<NotificationSummaryResponse> {
    const result: Array<{
      unreadCount?: number;
      maxPriorityRank?: number;
    }> = await this.em.getConnection().execute(
      `
      select
        count(*)::int as "unreadCount",
        coalesce(max(
          case priority
            when 'CRITICAL' then 4
            when 'HIGH' then 3
            when 'NORMAL' then 2
            when 'LOW' then 1
            else 0
          end
        ), 0)::int as "maxPriorityRank"
      from notifications
      where user_id = ?
        and read_at is null
        and dismissed_at is null
      `,
      [user.id],
    );

    const row = result[0] ?? {};
    const unreadCount = Number(row.unreadCount ?? 0);
    const maxPriorityRank = Number(row.maxPriorityRank ?? 0);

    const highestUnreadPriority = this.rankToPriority(maxPriorityRank);

    return {
      unreadCount,
      hasUnread: unreadCount > 0,
      highestUnreadPriority,
      hasHighPriorityUnread:
        highestUnreadPriority === NotificationPriority.HIGH ||
        highestUnreadPriority === NotificationPriority.CRITICAL,
      hasCriticalUnread:
        highestUnreadPriority === NotificationPriority.CRITICAL,
    };
  }

  private async getOwnedOrThrow(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const item = await this.em.findOne(Notification, {
      id: notificationId,
      user: userId,
    });

    if (!item) {
      throw new NotFoundException('Notification not found');
    }

    return item;
  }

  private serialize(item: Notification) {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      routeTarget: item.routeTarget,
      priority: item.priority,
      payload: item.payload,
      readAt: item.readAt,
      openedAt: item.openedAt,
      dismissedAt: item.dismissedAt,
      createdAt: item.createdAt,
    };
  }

  private rankToPriority(rank: number): NotificationPriority | null {
    if (rank >= 4) return NotificationPriority.CRITICAL;
    if (rank >= 3) return NotificationPriority.HIGH;
    if (rank >= 2) return NotificationPriority.NORMAL;
    if (rank >= 1) return NotificationPriority.LOW;
    return null;
  }
}
