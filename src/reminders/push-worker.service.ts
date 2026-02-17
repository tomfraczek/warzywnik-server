/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
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
    plantingDiseaseId?: string | null;
  };
};

type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: Record<string, unknown> };

const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;

  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};

@Injectable()
export class PushWorkerService {
  private readonly logger = new Logger(PushWorkerService.name);

  private readonly expoEndpoint = 'https://exp.host/--/api/v2/push/send';
  private readonly batchSize = 100;

  constructor(private readonly em: EntityManager) {}

  @Cron('*/1 * * * *')
  async handleCron(): Promise<void> {
    this.logger.log(
      `cron tick | PUSH_WORKER_ENABLED=${process.env.PUSH_WORKER_ENABLED} | NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}`,
    );

    if (process.env.PUSH_WORKER_ENABLED !== 'true') {
      this.logger.debug('worker disabled - returning');
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

    this.logger.log(
      `due reminders=${reminders.length} | now=${now.toISOString()}`,
    );

    for (const reminder of reminders) {
      await this.processReminder(reminder);
    }
  }

  private buildBody(reminder: Reminder): string {
    if (reminder.type === ReminderType.DISEASE_TREATMENT) {
      return 'Zastosuj zalecane leczenie choroby.';
    }

    return 'Sprawdź stan choroby w uprawie.';
  }

  private async processReminder(reminder: Reminder): Promise<void> {
    this.logger.log(
      `process reminder=${reminder.id} | user=${reminder.user?.id ?? 'unknown'} | scheduledAt=${reminder.scheduledAt?.toISOString?.() ?? String(reminder.scheduledAt)} | attempts=${reminder.attempts}`,
    );

    const devices = await this.em.find(UserDevice, {
      user: reminder.user.id,
      isEnabled: true,
    });

    this.logger.log(
      `devices found=${devices.length} | reminder=${reminder.id}`,
    );

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
        plantingDiseaseId: reminder.plantingDiseaseId ?? null,
      },
    }));

    this.logger.log(
      `sending push | reminder=${reminder.id} | messages=${messages.length}`,
    );

    try {
      const tickets = await this.sendPush(messages);

      this.logger.log(
        `expo tickets received=${tickets.length} | reminder=${reminder.id}`,
      );

      const firstError = tickets.find((t) => this.isErrorTicket(t));

      if (firstError) {
        this.logger.error(
          `expo ticket error | reminder=${reminder.id} | message=${firstError.message} | details=${firstError.details ? JSON.stringify(firstError.details) : 'null'}`,
        );
        await this.markFailure(reminder, firstError.message);
        return;
      }

      await this.markSuccess(reminder);
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      this.logger.error(
        `sendPush failed | reminder=${reminder.id} | error=${message}`,
      );
      await this.markFailure(reminder, message);
    }
  }

  private isErrorTicket(
    ticket: ExpoPushTicket,
  ): ticket is Extract<ExpoPushTicket, { status: 'error' }> {
    return ticket.status === 'error';
  }

  private extractTickets(json: unknown): ExpoPushTicket[] {
    if (!json || typeof json !== 'object') {
      return [];
    }

    const obj = json as { data?: unknown };

    // Shape 1: { data: [...] }
    if (Array.isArray(obj.data)) {
      return obj.data as ExpoPushTicket[];
    }

    // Shape 2: { data: { data: [...] } }
    if (obj.data && typeof obj.data === 'object') {
      const nested = obj.data as { data?: unknown };
      if (Array.isArray(nested.data)) {
        return nested.data as ExpoPushTicket[];
      }
    }

    return [];
  }

  private async sendPush(
    messages: ExpoPushMessage[],
  ): Promise<ExpoPushTicket[]> {
    // log only metadata (no tokens)
    this.logger.debug(`POST ${this.expoEndpoint} | batch=${messages.length}`);

    const response = await fetch(this.expoEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const text = await response.text();

    this.logger.debug(
      `expo response | ok=${response.ok} | status=${response.status} | bodyLen=${text.length}`,
    );

    if (!response.ok) {
      throw new Error(`Expo push failed (${response.status}): ${text}`);
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Expo push invalid JSON: ${text}`);
    }

    const tickets = this.extractTickets(json);

    if (tickets.length === 0) {
      throw new Error(`Expo push unexpected response: ${text}`);
    }

    return tickets;
  }

  private async markSuccess(reminder: Reminder): Promise<void> {
    reminder.status = ReminderStatus.SENT;
    reminder.sentAt = new Date();
    reminder.attempts += 1;
    reminder.lastError = null;
    await this.em.flush();

    this.logger.log(`marked success | reminder=${reminder.id}`);
  }

  private async markFailure(
    reminder: Reminder,
    message: string,
  ): Promise<void> {
    reminder.attempts += 1;
    reminder.lastError = message;

    if (reminder.attempts >= 10) {
      reminder.status = ReminderStatus.SKIPPED;
    }

    await this.em.flush();

    this.logger.warn(
      `marked failure | reminder=${reminder.id} | attempts=${reminder.attempts} | status=${reminder.status} | error=${message}`,
    );
  }
}
