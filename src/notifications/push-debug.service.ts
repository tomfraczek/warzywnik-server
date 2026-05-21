import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { UserDevice } from '../devices/user-device.entity';
import { PushDeliveryService } from './push-delivery.service';
import { PushTestDto } from './dto/push-debug.schemas';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationEventOutbox } from './entities/notification-event-outbox.entity';
import { NotificationBatch } from './entities/notification-batch.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';

type DebugExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type DebugExpoResponse = {
  data?: DebugExpoTicket[];
};

type DebugExpoReceipt = {
  id?: string;
  status?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type TicketSummary = {
  deviceId: string | null;
  token: string | null;
  platform: string | null;
  status: 'ok' | 'error';
  ticketId: string | null;
  errorCode: string | null;
  message: string | null;
};

@Injectable()
export class PushDebugService {
  constructor(
    private readonly em: EntityManager,
    private readonly pushDeliveryService: PushDeliveryService,
  ) {}

  async runPushTest(dto: PushTestDto) {
    const user = await this.em.findOne(User, { id: dto.userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const devices = await this.em.find(
      UserDevice,
      { user: user.id },
      { orderBy: [{ updatedAt: 'desc' }] },
    );

    const activeDevices = devices.filter((item) => item.isEnabled);
    if (activeDevices.length === 0) {
      return {
        user: {
          id: user.id,
          notificationsEnabled: user.notificationsEnabled,
        },
        activeTokens: [],
        tickets: [],
        receipts: {},
        errors: ['No active devices for user'],
        diagnostics: await this.buildDiagnostics(user),
      };
    }

    const nowIso = new Date().toISOString();

    const messages = activeDevices.map((device) => ({
      to: device.expoPushToken,
      title: dto.title,
      body: dto.body,
      data: {
        source: 'debug_push_test',
        userId: user.id,
        timestamp: nowIso,
      },
    }));

    const pushDelivery = this.pushDeliveryService as unknown as {
      sendMessagesToExpo: (
        payload: Array<Record<string, unknown>>,
        context?: {
          reason?: string;
          userId?: string;
          notificationType?: string;
        },
      ) => Promise<DebugExpoResponse>;
      fetchExpoReceipts: (
        ticketIds: string[],
        context?: {
          reason?: string;
          userId?: string;
          notificationType?: string;
        },
      ) => Promise<Record<string, DebugExpoReceipt>>;
    };

    const expoResponse = await pushDelivery.sendMessagesToExpo(messages, {
      reason: 'debug_push_test',
      userId: user.id,
      notificationType: 'DEBUG_PUSH_TEST',
    });

    const tickets: DebugExpoTicket[] = expoResponse.data ?? [];

    const ticketSummaries: TicketSummary[] = tickets.map((ticket, index) => {
      const device = activeDevices[index];
      return {
        deviceId: device?.id ?? null,
        token: device?.expoPushToken ?? null,
        platform: device?.platform ?? null,
        status: ticket?.status ?? 'error',
        ticketId: ticket?.id ?? null,
        errorCode: ticket?.details?.error ?? null,
        message: ticket?.message ?? null,
      };
    });

    const failedDeviceIds = new Set(
      ticketSummaries
        .filter((item) => item.errorCode === 'DeviceNotRegistered')
        .map((item) => item.deviceId)
        .filter((value): value is string => typeof value === 'string'),
    );

    for (const device of activeDevices) {
      if (!failedDeviceIds.has(device.id)) {
        continue;
      }

      device.isEnabled = false;
      device.disabledReason = 'DeviceNotRegistered';
      device.lastErrorCode = 'DeviceNotRegistered';
      device.lastErrorAt = new Date();
    }

    const ticketIds = ticketSummaries
      .map((item) => item.ticketId)
      .filter((value): value is string => typeof value === 'string');

    let receipts: Record<string, DebugExpoReceipt> = {};

    if (ticketIds.length > 0) {
      try {
        receipts = await pushDelivery.fetchExpoReceipts(ticketIds, {
          reason: 'debug_push_test',
          userId: user.id,
          notificationType: 'DEBUG_PUSH_TEST',
        });
      } catch {
        receipts = {};
      }
    }

    for (const ticketSummary of ticketSummaries) {
      if (!ticketSummary.ticketId) {
        continue;
      }

      const receipt = receipts[ticketSummary.ticketId];
      if (!receipt || receipt.details?.error !== 'DeviceNotRegistered') {
        continue;
      }

      const device = activeDevices.find(
        (item) => item.id === ticketSummary.deviceId,
      );
      if (!device) {
        continue;
      }

      device.isEnabled = false;
      device.disabledReason = 'DeviceNotRegistered';
      device.lastErrorCode = 'DeviceNotRegistered';
      device.lastErrorAt = new Date();
    }

    await this.em.flush();

    return {
      user: {
        id: user.id,
        notificationsEnabled: user.notificationsEnabled,
      },
      activeTokens: activeDevices.map((device) => ({
        deviceId: device.id,
        token: device.expoPushToken,
        platform: device.platform,
      })),
      tickets: ticketSummaries,
      receipts,
      errors: ticketSummaries
        .filter((item) => item.status === 'error')
        .map((item) => ({
          token: item.token,
          platform: item.platform,
          errorCode: item.errorCode,
          message: item.message,
        })),
      diagnostics: await this.buildDiagnostics(user),
    };
  }

  private async buildDiagnostics(user: User) {
    const [preferences, devices, events, batches, deliveries] =
      await Promise.all([
        this.em.findOne(NotificationPreference, { user: user.id }),
        this.em.find(
          UserDevice,
          { user: user.id },
          { orderBy: [{ updatedAt: 'desc' }] },
        ),
        this.em.find(
          NotificationEventOutbox,
          { user: user.id },
          { orderBy: [{ createdAt: 'desc' }], limit: 20 },
        ),
        this.em.find(
          NotificationBatch,
          { user: user.id },
          { orderBy: [{ createdAt: 'desc' }], limit: 20 },
        ),
        this.em.find(
          NotificationDelivery,
          {
            batch: {
              user: user.id,
            },
          },
          {
            populate: ['batch', 'userDevice'],
            orderBy: [{ createdAt: 'desc' }],
            limit: 30,
          },
        ),
      ]);

    return {
      globalPreferences: {
        notificationsEnabled: user.notificationsEnabled,
        notificationHour: user.notificationHour,
      },
      typePreferences: preferences
        ? {
            tasksEnabled: preferences.tasksEnabled,
            dailySummaryEnabled: preferences.dailySummaryEnabled,
            weatherStatusEnabled: preferences.weatherStatusEnabled,
            gardenRiskEnabled: preferences.gardenRiskEnabled,
            weatherAlertsEnabled: preferences.weatherAlertsEnabled,
            recommendedArticlesEnabled: preferences.recommendedArticlesEnabled,
            lifecycleSuggestionsEnabled:
              preferences.lifecycleSuggestionsEnabled,
            weeklyDigestEnabled: preferences.weeklyDigestEnabled,
            intensity: preferences.intensity,
          }
        : null,
      devices: devices.map((device) => ({
        id: device.id,
        platform: device.platform,
        token: device.expoPushToken,
        isEnabled: device.isEnabled,
        disabledReason:
          (device as { disabledReason?: string | null }).disabledReason ?? null,
        lastSuccessAt:
          (device as { lastSuccessAt?: Date | null }).lastSuccessAt ?? null,
        lastErrorAt:
          (device as { lastErrorAt?: Date | null }).lastErrorAt ?? null,
        lastErrorCode:
          (device as { lastErrorCode?: string | null }).lastErrorCode ?? null,
        lastReceiptCheckedAt:
          (device as { lastReceiptCheckedAt?: Date | null })
            .lastReceiptCheckedAt ?? null,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      })),
      recentEvents: events.map((event) => ({
        id: event.id,
        type: event.type,
        status: event.status,
        dedupeKey: event.dedupeKey,
        errorMessage: event.errorMessage,
        availableAt: event.availableAt,
        createdAt: event.createdAt,
        processedAt: event.processedAt,
      })),
      recentBatches: batches.map((batch) => ({
        id: batch.id,
        type: batch.type,
        status: batch.status,
        dedupeKey: batch.dedupeKey,
        skippedReason: batch.skippedReason,
        sendAfter: batch.sendAfter,
        createdAt: batch.createdAt,
        sentAt: batch.sentAt,
      })),
      recentDeliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        batchId: delivery.batch.id,
        type: delivery.batch.type,
        status: delivery.status,
        token: delivery.userDevice?.expoPushToken ?? null,
        platform: delivery.userDevice?.platform ?? null,
        ticketId: delivery.expoTicketId,
        receiptId: delivery.expoReceiptId,
        errorCode: delivery.errorCode,
        errorMessage: delivery.errorMessage,
        createdAt: delivery.createdAt,
        sentAt: delivery.sentAt,
        failedAt: delivery.failedAt,
      })),
    };
  }
}
