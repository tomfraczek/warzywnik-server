import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotificationBatch } from './entities/notification-batch.entity';
import {
  NotificationBatchStatus,
  NotificationDeliveryPolicy,
  NotificationDeliveryStatus,
} from '../common/enums/notification.enums';
import { UserDevice } from '../devices/user-device.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { NotificationCenterService } from './notification-center.service';
import { PushNotificationPayload } from './notification.types';
import { Notification } from './entities/notification.entity';

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
};

type ExpoReceipt = {
  id?: string;
  status?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);
  private readonly expoSendEndpoint = 'https://exp.host/--/api/v2/push/send';
  private readonly expoReceiptsEndpoint =
    'https://exp.host/--/api/v2/push/getReceipts';

  constructor(
    private readonly em: EntityManager,
    private readonly notificationCenterService: NotificationCenterService,
  ) {}

  @Cron('*/1 * * * *', { name: 'notification-push-delivery' })
  async deliverPendingBatches(): Promise<void> {
    try {
      const batches = await this.em.find(
        NotificationBatch,
        {
          status: NotificationBatchStatus.PENDING,
          sendAfter: { $lte: new Date() },
        },
        {
          populate: ['user'],
          orderBy: [{ createdAt: 'asc' }],
          limit: 100,
        },
      );

      for (const batch of batches) {
        await this.deliverBatch(batch);
      }
    } finally {
      this.em.clear();
    }
  }

  @Cron('*/10 * * * *', { name: 'notification-push-receipts' })
  async checkReceipts(): Promise<void> {
    try {
    const deliveries = await this.em.find(
      NotificationDelivery,
      {
        status: NotificationDeliveryStatus.SENT,
        expoTicketId: { $ne: null },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      {
        populate: ['userDevice'],
        limit: 300,
      },
    );

    const ticketIds = deliveries
      .map((delivery) => delivery.expoTicketId)
      .filter((value): value is string => typeof value === 'string');

    if (ticketIds.length === 0) {
      return;
    }

    const receipts = await this.fetchExpoReceipts(ticketIds, {
      reason: 'scheduled_receipts_check',
      notificationType: 'BULK',
    });

    for (const delivery of deliveries) {
      const ticketId = delivery.expoTicketId;
      if (!ticketId) continue;

      const receipt = receipts[ticketId];
      if (!receipt) continue;

      this.logger.log(
        `push receipt checked ticket=${ticketId} status=${receipt.status ?? 'unknown'} error=${receipt.details?.error ?? 'none'} message=${receipt.message ?? 'none'}`,
      );

      delivery.expoReceiptId =
        typeof receipt.id === 'string' ? receipt.id : null;

      if (receipt.status === 'error') {
        delivery.status = NotificationDeliveryStatus.FAILED;
        delivery.failedAt = new Date();
        delivery.errorCode = receipt.details?.error ?? 'EXPO_RECEIPT_ERROR';
        delivery.errorMessage = receipt.message ?? 'Expo receipt error';

        if (
          delivery.userDevice &&
          delivery.errorCode === 'DeviceNotRegistered'
        ) {
          delivery.userDevice.isEnabled = false;
          delivery.userDevice.disabledReason = 'DeviceNotRegistered';
          delivery.userDevice.lastErrorAt = new Date();
          delivery.userDevice.lastErrorCode = 'DeviceNotRegistered';
        }
      }

      if (delivery.userDevice) {
        delivery.userDevice.lastReceiptCheckedAt = new Date();
      }
    }

    await this.em.flush();
    } finally {
      this.em.clear();
    }
  }

  private async deliverBatch(batch: NotificationBatch): Promise<void> {
    // Atomically claim the batch: only the first concurrent run proceeds.
    // This prevents two simultaneous deliverPendingBatches() executions from
    // sending the same push twice to the user's device.
    const claimed = await this.em.getConnection().execute(
      `UPDATE notification_batches SET status = 'PROCESSING'
       WHERE id = ? AND status = 'PENDING'
       RETURNING id`,
      [batch.id],
    );
    if (claimed.length === 0) {
      // Another run already claimed this batch — skip silently.
      return;
    }
    // Refresh local entity state to reflect the DB update
    batch.status = NotificationBatchStatus.PROCESSING;

    // PLAN_ONLY batches are created SKIPPED by the aggregator;
    // guard here as a safety net so we never push plan-only tasks.
    if (batch.deliveryPolicy === NotificationDeliveryPolicy.PLAN_ONLY) {
      batch.status = NotificationBatchStatus.SKIPPED;
      batch.skippedReason = 'plan_only';
      await this.em.flush();
      return;
    }

    const notification = await this.ensureNotification(batch);

    const devices = await this.em.find(UserDevice, {
      user: batch.user.id,
      isEnabled: true,
    });

    if (devices.length === 0) {
      batch.status = NotificationBatchStatus.SKIPPED;
      batch.skippedReason = 'no_device';
      batch.sentAt = new Date();
      await this.em.flush();
      this.logger.log(
        `notification skipped user=${batch.user.id} batch=${batch.id} reason=no_device`,
      );
      return;
    }

    const payload = this.toPushPayload(notification, batch);

    const messages = devices.map((device) => ({
      to: device.expoPushToken,
      title: batch.title,
      body: batch.body,
      data: payload,
    }));

    for (const device of devices) {
      this.logger.log(
        `push send attempt userId=${batch.user.id} notificationType=${batch.type} token=${device.expoPushToken} platform=${device.platform} payload=${JSON.stringify(payload)} timestamp=${new Date().toISOString()}`,
      );
    }

    try {
      const response = await this.sendMessagesToExpo(messages, {
        reason: 'deliver_batch',
        userId: batch.user.id,
        notificationType: batch.type,
      });
      const tickets = response.data ?? [];

      for (let index = 0; index < devices.length; index += 1) {
        const device = devices[index];
        const ticket = tickets[index];
        const delivery = new NotificationDelivery();
        delivery.notification = notification;
        delivery.batch = batch;
        delivery.userDevice = device;
        delivery.attemptCount = 1;

        if (!ticket || ticket.status === 'error') {
          delivery.status = NotificationDeliveryStatus.FAILED;
          delivery.failedAt = new Date();
          delivery.errorCode = ticket?.details?.error ?? 'EXPO_SEND_ERROR';
          delivery.errorMessage = ticket?.message ?? 'Expo send failed';

          this.logger.error(
            `push send failed userId=${batch.user.id} notificationType=${batch.type} token=${device.expoPushToken} platform=${device.platform} error=${delivery.errorCode} message=${delivery.errorMessage}`,
          );

          device.lastErrorAt = new Date();
          device.lastErrorCode = delivery.errorCode;
          if (delivery.errorCode === 'DeviceNotRegistered') {
            device.isEnabled = false;
            device.disabledReason = 'DeviceNotRegistered';
          }
        } else {
          delivery.status = NotificationDeliveryStatus.SENT;
          delivery.sentAt = new Date();
          delivery.expoTicketId = ticket.id ?? null;
          device.lastSuccessAt = new Date();
          device.lastErrorCode = null;

          this.logger.log(
            `push send success userId=${batch.user.id} notificationType=${batch.type} token=${device.expoPushToken} platform=${device.platform} ticketId=${delivery.expoTicketId ?? 'none'}`,
          );
        }

        this.em.persist(delivery);
      }

      const hasSent = tickets.some((ticket) => ticket?.status === 'ok');
      batch.status = hasSent
        ? NotificationBatchStatus.SENT
        : NotificationBatchStatus.FAILED;
      batch.sentAt = new Date();
      batch.skippedReason = hasSent ? null : 'expo_send_failed';
      await this.em.flush();

      this.logger.log(
        `notification batch delivered user=${batch.user.id} batch=${batch.id} status=${batch.status}`,
      );
    } catch (error: unknown) {
      batch.status = NotificationBatchStatus.FAILED;
      batch.skippedReason =
        error instanceof Error ? error.message : 'unknown_send_error';
      await this.em.flush();
    }
  }

  private async ensureNotification(
    batch: NotificationBatch,
  ): Promise<Notification> {
    const existingId =
      typeof batch.payload.notificationId === 'string'
        ? batch.payload.notificationId
        : null;

    if (existingId) {
      const existing = await this.em.findOne(Notification, { id: existingId });
      if (existing) {
        return existing;
      }
    }

    const notification =
      await this.notificationCenterService.createNotification({
        user: batch.user,
        type: batch.type,
        routeTarget: batch.routeTarget,
        title: batch.title,
        body: batch.body,
        payload: batch.payload,
        priority: batch.priority,
      });

    batch.payload = {
      ...batch.payload,
      notificationId: notification.id,
    };

    await this.em.flush();

    return notification;
  }

  private toPushPayload(
    notification: Notification,
    batch: NotificationBatch,
  ): PushNotificationPayload {
    const payload = batch.payload;

    return {
      notificationId: notification.id,
      type: notification.type,
      routeTarget: notification.routeTarget,
      priority: notification.priority,
      title: notification.title,
      body: notification.body,
      bedId: this.optionalString(payload.bedId),
      plantingId: this.optionalString(payload.plantingId),
      actionTaskIds: this.optionalStringArray(payload.actionTaskIds),
      bedIds: this.optionalStringArray(payload.bedIds),
      plantingIds: this.optionalStringArray(payload.plantingIds),
      warningIds: this.optionalStringArray(payload.warningIds),
      warningCode: this.optionalString(payload.warningCode),
      riskLevel: this.optionalRiskLevel(payload.riskLevel),
      riskReason: this.optionalString(payload.riskReason),
      articleId: this.optionalString(payload.articleId),
      articleSlug: this.optionalString(payload.articleSlug),
      dedupeKey: batch.dedupeKey,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private optionalStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const items = value.filter(
      (item): item is string => typeof item === 'string',
    );
    return items.length > 0 ? items : undefined;
  }

  private optionalRiskLevel(
    value: unknown,
  ): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined {
    if (
      value === 'NONE' ||
      value === 'LOW' ||
      value === 'MEDIUM' ||
      value === 'HIGH' ||
      value === 'CRITICAL'
    ) {
      return value;
    }

    return undefined;
  }

  private async sendToExpo(
    messages: Array<Record<string, unknown>>,
  ): Promise<ExpoPushResponse> {
    const response = await fetch(this.expoSendEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Expo send failed (${response.status}): ${text}`);
    }

    return (JSON.parse(text) as ExpoPushResponse) ?? {};
  }

  async sendMessagesToExpo(
    messages: Array<Record<string, unknown>>,
    context?: {
      reason?: string;
      userId?: string;
      notificationType?: string;
    },
  ): Promise<ExpoPushResponse> {
    const response = await this.sendToExpo(messages);
    const tickets = response.data ?? [];

    tickets.forEach((ticket, index) => {
      const target = messages[index]?.to;
      this.logger.log(
        `push expo response reason=${context?.reason ?? 'unknown'} userId=${context?.userId ?? 'unknown'} notificationType=${context?.notificationType ?? 'unknown'} token=${typeof target === 'string' ? target : 'unknown'} ticketStatus=${ticket?.status ?? 'unknown'} ticketId=${ticket?.id ?? 'none'} error=${ticket?.details?.error ?? 'none'} message=${ticket?.message ?? 'none'}`,
      );
    });

    return response;
  }

  async fetchExpoReceipts(
    ticketIds: string[],
    context?: {
      reason?: string;
      userId?: string;
      notificationType?: string;
    },
  ): Promise<Record<string, ExpoReceipt>> {
    const response = await fetch(this.expoReceiptsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ticketIds }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Expo receipts failed (${response.status}): ${text}`);
    }

    const parsed = JSON.parse(text) as {
      data?: Record<string, ExpoReceipt>;
    };

    const data = parsed.data ?? {};

    Object.entries(data).forEach(([ticketId, receipt]) => {
      this.logger.log(
        `push expo receipt reason=${context?.reason ?? 'unknown'} userId=${context?.userId ?? 'unknown'} notificationType=${context?.notificationType ?? 'unknown'} ticketId=${ticketId} status=${receipt?.status ?? 'unknown'} error=${receipt?.details?.error ?? 'none'} message=${receipt?.message ?? 'none'}`,
      );
    });

    return data;
  }
}
