/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { Reminder } from './reminder.entity';
import { ReminderStatus, ReminderType } from '../common/enums/reminder.enums';
import { UserDevice } from '../devices/user-device.entity';

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: {
    reminderId: string;
    plantingId: string;
    diseaseId: string;
  };
};

type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: Record<string, unknown> };

type ExpoPushResponse = {
  data: ExpoPushTicket[];
};

@Injectable()
export class PushWorkerService {
  private readonly expoEndpoint = 'https://exp.host/--/api/v2/push/send';
  private readonly batchSize = 100;

  constructor(private readonly em: EntityManager) {}

  @Cron('*/1 * * * *')
  async handleCron() {
    if (process.env.PUSH_WORKER_ENABLED !== 'true') {
      return;
    }

    const now = new Date();

    const reminders = await this.em.find(
      Reminder,
      {
        status: ReminderStatus.PENDING,
        scheduledAt: { $lte: now },
      },
      {
        orderBy: { scheduledAt: 'asc' },
        limit: this.batchSize,
        populate: ['user'],
      },
    );

    for (const reminder of reminders) {
      await this.processReminder(reminder);
    }
  }

  private buildBody(reminder: Reminder) {
    if (reminder.type === ReminderType.DISEASE_TREATMENT) {
      return 'Zastosuj zalecane leczenie choroby.';
    }

    return 'Sprawdź stan choroby w uprawie.';
  }

  private async processReminder(reminder: Reminder) {
    const devices = await this.em.find(UserDevice, {
      user: reminder.user.id,
      isEnabled: true,
    });

    if (devices.length === 0) {
      await this.markFailure(reminder, 'No active devices');
      return;
    }

    const messages: ExpoPushMessage[] = devices.map((device) => ({
      to: device.expoPushToken,
      title: 'Warzywnik',
      body: this.buildBody(reminder),
      data: {
        reminderId: reminder.id,
        plantingId: reminder.payload.plantingId,
        diseaseId: reminder.payload.diseaseId,
      },
    }));

    try {
      const response = await this.sendPush(messages);

      const hasError = response.data.some(
        (ticket) => ticket.status === 'error',
      );
      if (hasError) {
        const firstError = response.data.find(
          (ticket) => ticket.status === 'error',
        ) as ExpoPushTicket | undefined;

        const message =
          firstError && firstError.status === 'error'
            ? firstError.message
            : 'Unknown Expo error';

        await this.markFailure(reminder, message);
        return;
      }

      await this.markSuccess(reminder);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await this.markFailure(reminder, message);
    }
  }

  private async sendPush(
    messages: ExpoPushMessage[],
  ): Promise<ExpoPushResponse> {
    const response = await fetch(this.expoEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Expo push failed (${response.status}): ${text}`);
    }

    return (await response.json()) as ExpoPushResponse;
  }

  private async markSuccess(reminder: Reminder) {
    reminder.status = ReminderStatus.SENT;
    reminder.sentAt = new Date();
    reminder.attempts += 1;
    reminder.lastError = null;
    await this.em.flush();
  }

  private async markFailure(reminder: Reminder, message: string) {
    reminder.attempts += 1;
    reminder.lastError = message;

    if (reminder.attempts >= 10) {
      reminder.status = ReminderStatus.SKIPPED;
    }

    await this.em.flush();
  }
}
