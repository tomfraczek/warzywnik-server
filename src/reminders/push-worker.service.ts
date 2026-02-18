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
    if (process.env.PUSH_WORKER_ENABLED !== 'true') return;

    await this.resetStuckProcessing();

    const reminders = await this.claimDueReminders(this.batchSize);
    await this.em.populate(reminders, ['user']);

    this.logger.log(`claimed reminders=${reminders.length}`);

    for (const reminder of reminders) {
      try {
        await this.processReminder(reminder);

        await this.em.nativeUpdate(
          Reminder,
          { id: reminder.id },
          {
            status: ReminderStatus.SENT,
            sentAt: new Date(),
            lockedAt: null,
            lastError: null,
          },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        const status =
          reminder.attempts + 1 >= 10
            ? ReminderStatus.SKIPPED
            : ReminderStatus.PENDING;

        await this.em.nativeUpdate(
          Reminder,
          { id: reminder.id },
          {
            status,
            lockedAt: null,
            lastError: message,
          },
        );
      }
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
      throw new Error('No active devices');
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
        throw new Error(firstError.message);
      }
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      this.logger.error(
        `sendPush failed | reminder=${reminder.id} | error=${message}`,
      );
      throw new Error(message);
    }
  }

  private async resetStuckProcessing(): Promise<void> {
    await this.em.getConnection().execute(`
      UPDATE reminders
      SET status = 'pending',
          locked_at = NULL
      WHERE status = 'processing'
        AND locked_at < now() - interval '15 minutes'
    `);
  }

  private async claimDueReminders(limit: number): Promise<Reminder[]> {
    const sql = `
      WITH due AS (
        SELECT id
        FROM reminders
        WHERE status = 'pending'
          AND scheduled_at <= now()
        ORDER BY scheduled_at ASC
        LIMIT ?
        FOR UPDATE SKIP LOCKED
      )
      UPDATE reminders r
      SET status = 'processing',
          locked_at = now(),
          attempts = r.attempts + 1,
          last_error = NULL
      FROM due
      WHERE r.id = due.id
      RETURNING r.*;
    `;

    const rows = await this.em.getConnection().execute(sql, [limit]);

    return (rows as Record<string, unknown>[]).map((row) =>
      this.em.map(Reminder, row),
    );
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
}
