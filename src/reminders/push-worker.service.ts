import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'crypto';
import { Reminder, ReminderPayload } from './reminder.entity';
import {
  ReminderAction,
  ReminderStatus,
  ReminderType,
} from '../common/enums/reminder.enums';
import { UserDevice } from '../devices/user-device.entity';
import { User } from '../users/user.entity';
import { RemindersService } from './reminders.service';

type ExpoPushMessageData = {
  reminderId: string;
  target: 'disease' | 'pest' | 'action';
  plantingId?: string;
  diseaseId?: string;
  plantingDiseaseId?: string | null;
  pestId?: string;
  pestOccurrenceId?: string | null;
  actionTaskId?: string;
  actionTemplateId?: string;
  bedId?: string;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: ExpoPushMessageData;
};

type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: Record<string, unknown> };

type ClaimedReminderRow = {
  id: string;
  user_id: string;
  scheduled_at: string | Date;
  status: ReminderStatus;
  type: ReminderType;
  payload: unknown;
  planting_disease_id: string | null;
  pest_occurrence_id: string | null;
  action_task_id: string | null;
  sent_at: string | Date | null;
  attempts: number;
  last_error: string | null;
  locked_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};

const toDate = (val: string | Date | null | undefined): Date | null => {
  if (!val) return null;
  return val instanceof Date ? val : new Date(val);
};

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === 'string' && val.length > 0;

const isReminderPayload = (payload: unknown): payload is ReminderPayload => {
  if (!payload || typeof payload !== 'object') return false;

  const obj = payload as Record<string, unknown>;
  const isDiseasePayload =
    isNonEmptyString(obj.plantingId) &&
    isNonEmptyString(obj.diseaseId) &&
    isNonEmptyString(obj.plantingDiseaseId);

  const isPestPayload =
    isNonEmptyString(obj.plantingId) &&
    isNonEmptyString(obj.pestId) &&
    isNonEmptyString(obj.pestOccurrenceId);

  const isActionPayload = isNonEmptyString(obj.actionTaskId);

  return (
    (isDiseasePayload || isPestPayload || isActionPayload) &&
    Object.values(ReminderAction).includes(obj.action as ReminderAction)
  );
};

@Injectable()
export class PushWorkerService {
  private readonly logger = new Logger(PushWorkerService.name);
  private readonly instanceId = randomUUID();
  private isRunning = false;

  private readonly expoEndpoint = 'https://exp.host/--/api/v2/push/send';
  private readonly batchSize = 100;

  constructor(
    private readonly em: EntityManager,
    private readonly remindersService: RemindersService,
  ) {
    this.logger.log(
      `worker created | pid=${process.pid} | instance=${this.instanceId}`,
    );
  }

  @Cron('*/1 * * * *', { name: 'push-reminders' })
  async handleCron(): Promise<void> {
    this.logger.log(
      `cron tick | pid=${process.pid} | instance=${this.instanceId} | PUSH_WORKER_ENABLED=${process.env.PUSH_WORKER_ENABLED} | NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}`,
    );

    if (this.isRunning) {
      this.logger.warn(
        `cron skip (already running) | pid=${process.pid} | instance=${this.instanceId}`,
      );
      return;
    }

    if (process.env.PUSH_WORKER_ENABLED !== 'true') {
      this.logger.debug('worker disabled - returning');
      return;
    }

    this.isRunning = true;

    try {
      await this.resetStuckProcessing();

      const claimed = await this.claimDueReminders(this.batchSize);

      this.logger.log(`claimed reminders=${claimed.length}`);

      for (const reminder of claimed) {
        await this.processReminder(reminder);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async resetStuckProcessing(): Promise<void> {
    // Return PROCESSING reminders to PENDING if they were locked long ago (worker crash / deploy).
    const sql = `
      UPDATE reminders
      SET status = ?,
          locked_at = NULL
      WHERE status = ?
        AND locked_at IS NOT NULL
        AND locked_at < now() - interval '15 minutes'
    `;

    await this.em
      .getConnection()
      .execute(sql, [ReminderStatus.PENDING, ReminderStatus.PROCESSING]);
  }

  private async claimDueReminders(limit: number): Promise<Reminder[]> {
    // Atomically claim due reminders across multiple instances:
    // - pick pending + scheduled_at <= now()
    // - lock rows with SKIP LOCKED
    // - set status=processing, locked_at=now(), attempts=attempts+1
    // - RETURNING claimed rows
    const sql = `
      WITH due AS (
        SELECT id
        FROM reminders
        WHERE status = ?
          AND scheduled_at <= now()
        ORDER BY scheduled_at ASC
        LIMIT ?
        FOR UPDATE SKIP LOCKED
      )
      UPDATE reminders r
      SET status = ?,
          locked_at = now(),
          attempts = r.attempts + 1,
          last_error = NULL
      FROM due
      WHERE r.id = due.id
      RETURNING
        r.id,
        r.user_id,
        r.scheduled_at,
        r.status,
        r.type,
        r.payload,
        r.planting_disease_id,
        r.pest_occurrence_id,
        r.action_task_id,
        r.sent_at,
        r.attempts,
        r.last_error,
        r.locked_at,
        r.created_at,
        r.updated_at;
    `;

    const rows: ClaimedReminderRow[] = await this.em
      .getConnection()
      .execute(sql, [ReminderStatus.PENDING, limit, ReminderStatus.PROCESSING]);

    return rows.map((row) =>
      this.em.create(
        Reminder,
        {
          id: row.id,
          user: this.em.getReference(User, row.user_id),
          scheduledAt: toDate(row.scheduled_at) ?? new Date(),
          status: row.status,
          type: row.type,
          payload: this.requirePayload(row.payload, row.id),
          plantingDiseaseId: row.planting_disease_id,
          pestOccurrenceId: row.pest_occurrence_id,
          actionTaskId: row.action_task_id,
          sentAt: toDate(row.sent_at),
          attempts: row.attempts,
          lastError: row.last_error,
          lockedAt: toDate(row.locked_at),
          createdAt: toDate(row.created_at) ?? new Date(),
          updatedAt: toDate(row.updated_at) ?? new Date(),
        },
        { persist: false },
      ),
    );
  }

  private requirePayload(
    payload: unknown,
    reminderId: string,
  ): ReminderPayload {
    if (!isReminderPayload(payload)) {
      throw new Error(`Invalid reminder payload for ${reminderId}`);
    }

    return payload;
  }

  private buildBody(reminder: Reminder): string {
    if (reminder.type === ReminderType.ACTION_TASK_DUE) {
      const payload = reminder.payload;
      if ('kind' in payload && payload.kind === 'action') {
        return `Czas na: ${payload.actionTemplateName ?? 'zaplanowany zabieg'}`;
      }
      return 'Czas na zaplanowany zabieg.';
    }

    if (reminder.type === ReminderType.DISEASE_TREATMENT) {
      return 'Zastosuj zalecane leczenie choroby.';
    }
    if (reminder.type === ReminderType.PEST_CHECK) {
      return 'Sprawdź stan szkodników w uprawie.';
    }
    return 'Sprawdź stan choroby w uprawie.';
  }

  private buildMessageData(reminder: Reminder): ExpoPushMessageData {
    const payload = reminder.payload;

    if ('kind' in payload && payload.kind === 'action') {
      return {
        reminderId: reminder.id,
        target: 'action',
        actionTaskId: payload.actionTaskId,
        actionTemplateId: payload.actionTemplateId,
        bedId: payload.bedId,
        plantingId: payload.plantingId,
      };
    }

    if ('pestOccurrenceId' in payload) {
      return {
        reminderId: reminder.id,
        target: 'pest',
        plantingId: payload.plantingId,
        pestId: payload.pestId,
        pestOccurrenceId: reminder.pestOccurrenceId ?? payload.pestOccurrenceId,
      };
    }

    return {
      reminderId: reminder.id,
      target: 'disease',
      plantingId: payload.plantingId,
      diseaseId: payload.diseaseId,
      plantingDiseaseId:
        reminder.plantingDiseaseId ?? payload.plantingDiseaseId ?? null,
    };
  }

  private async processReminder(reminder: Reminder): Promise<void> {
    this.logger.log(
      `process reminder=${reminder.id} | user=${reminder.user.id} | scheduledAt=${reminder.scheduledAt.toISOString()} | attempts=${reminder.attempts}`,
    );

    const devices = await this.em.find(UserDevice, {
      user: reminder.user.id,
      isEnabled: true,
    });

    this.logger.log(
      `devices found=${devices.length} | reminder=${reminder.id}`,
    );

    if (devices.length === 0) {
      await this.markFailure(
        reminder.id,
        reminder.attempts,
        'No active devices',
      );
      return;
    }

    const messages: ExpoPushMessage[] = devices.map((device) => ({
      to: device.expoPushToken,
      title: 'Warzywnik',
      body: this.buildBody(reminder),
      data: this.buildMessageData(reminder),
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
        await this.markFailure(
          reminder.id,
          reminder.attempts,
          firstError.message,
        );
        return;
      }

      await this.markSuccess(reminder.id);
      await this.handleFollowUp(reminder);
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      this.logger.error(
        `sendPush failed | reminder=${reminder.id} | error=${message}`,
      );
      await this.markFailure(reminder.id, reminder.attempts, message);
    }
  }

  private async handleFollowUp(reminder: Reminder): Promise<void> {
    try {
      if (reminder.plantingDiseaseId) {
        await this.remindersService.handlePlantingDiseaseReminderSent({
          reminderId: reminder.id,
        });
        return;
      }

      if (reminder.pestOccurrenceId) {
        await this.remindersService.handlePestOccurrenceReminderSent({
          reminderId: reminder.id,
        });
        return;
      }

      if (reminder.actionTaskId) {
        return;
      }
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      this.logger.error(
        `follow-up failed | reminder=${reminder.id} | error=${message}`,
      );
    }
  }

  private isErrorTicket(
    ticket: ExpoPushTicket,
  ): ticket is Extract<ExpoPushTicket, { status: 'error' }> {
    return ticket.status === 'error';
  }

  private extractTickets(json: unknown): ExpoPushTicket[] {
    if (!json || typeof json !== 'object') return [];

    const obj = json as { data?: unknown };

    if (Array.isArray(obj.data)) {
      return obj.data as ExpoPushTicket[];
    }

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
    this.logger.debug(`POST ${this.expoEndpoint} | batch=${messages.length}`);

    const response = await fetch(this.expoEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  private async markSuccess(reminderId: string): Promise<void> {
    await this.em.nativeUpdate(
      Reminder,
      { id: reminderId },
      {
        status: ReminderStatus.SENT,
        sentAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    );

    this.logger.log(`marked success | reminder=${reminderId}`);
  }

  private async markFailure(
    reminderId: string,
    attempts: number,
    message: string,
  ): Promise<void> {
    // attempts is already incremented in claim
    const shouldSkip = attempts >= 10;

    await this.em.nativeUpdate(
      Reminder,
      { id: reminderId },
      {
        status: shouldSkip ? ReminderStatus.SKIPPED : ReminderStatus.PENDING,
        lockedAt: null,
        lastError: message,
      },
    );

    this.logger.warn(
      `marked failure | reminder=${reminderId} | attempts=${attempts} | status=${shouldSkip ? ReminderStatus.SKIPPED : ReminderStatus.PENDING} | error=${message}`,
    );
  }
}
