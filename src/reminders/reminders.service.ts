import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Reminder, ReminderPayload } from './reminder.entity';
import {
  ReminderAction,
  ReminderStatus,
  ReminderType,
} from '../common/enums/reminder.enums';
import {
  ListRemindersQueryDto,
  PatchReminderDto,
} from './dto/reminder.schemas';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Disease } from '../diseases/disease.entity';
import { PlantingDisease } from '../planting-diseases/planting-disease.entity';
import { PlantingDiseaseStatus } from '../common/enums/planting-disease.enums';
import { Pest } from '../pests/pest.entity';
import { PestOccurrence } from '../pest-occurrences/pest-occurrence.entity';
import { PestOccurrenceStatus } from '../common/enums/pest-occurrence.enums';
import { ActionTask } from '../action-tasks/action-task.entity';
import { ActionTaskStatus } from '../common/enums/action.enums';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  private readonly suspectedIntervalMs = 24 * 60 * 60 * 1000;
  private readonly confirmedIntervalMs = 48 * 60 * 60 * 1000;
  private readonly maxRemindersSuspected = 3;
  private readonly maxRemindersConfirmed = 2;

  private readonly activeReminderStatuses = [
    ReminderStatus.PENDING,
    ReminderStatus.PROCESSING,
  ];

  constructor(private readonly em: EntityManager) {}

  async list(user: User, query: ListRemindersQueryDto) {
    const { page, limit, status } = query;

    const [items, total] = await this.em.findAndCount(
      Reminder,
      { user: user.id, status },
      {
        limit,
        offset: (page - 1) * limit,
        orderBy: { scheduledAt: 'asc' },
      },
    );

    return {
      items: items.map((item) => this.serialize(item)),
      page,
      limit,
      total,
    };
  }

  async patch(user: User, id: string, dto: PatchReminderDto) {
    const reminder = await this.em.findOne(Reminder, {
      id,
      user: user.id,
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    if (reminder.status === ReminderStatus.CANCELED) {
      throw new ConflictException('Reminder is canceled');
    }

    reminder.status = dto.status;
    await this.em.flush();

    return this.serialize(reminder);
  }

  async createForPlantingDisease(params: {
    user: User;
    planting: Planting;
    disease: Disease;
    plantingDisease: PlantingDisease;
  }) {
    const { user, planting, disease, plantingDisease } = params;

    if (plantingDisease.status === PlantingDiseaseStatus.RESOLVED) {
      plantingDisease.nextCheckAt = null;
      plantingDisease.reminderCount = 0;
      await this.cancelPending('disease', plantingDisease.id);
      await this.em.flush();
      return [];
    }

    await this.scheduleNextForOccurrence({
      kind: 'disease',
      occurrence: plantingDisease,
      status: plantingDisease.status,
      user,
      planting,
      disease,
      resetReminderCount: true,
    });

    await this.em.flush();

    this.logger.log(
      `scheduled planting disease reminder | occurrence=${plantingDisease.id} | nextCheckAt=${plantingDisease.nextCheckAt?.toISOString() ?? 'null'}`,
    );

    return [];
  }

  async updateForPlantingDiseaseStatusChange(params: {
    user: User;
    planting: Planting;
    disease: Disease;
    plantingDisease: PlantingDisease;
    previousStatus: PlantingDiseaseStatus;
  }) {
    const { user, planting, disease, plantingDisease, previousStatus } = params;

    if (plantingDisease.status === previousStatus) {
      return;
    }

    if (plantingDisease.status === PlantingDiseaseStatus.RESOLVED) {
      plantingDisease.nextCheckAt = null;
      plantingDisease.reminderCount = 0;
      await this.cancelPending('disease', plantingDisease.id);
      await this.em.flush();

      this.logger.log(
        `resolved planting disease | occurrence=${plantingDisease.id}`,
      );

      return;
    }

    await this.scheduleNextForOccurrence({
      kind: 'disease',
      occurrence: plantingDisease,
      status: plantingDisease.status,
      user,
      planting,
      disease,
      resetReminderCount: true,
    });

    await this.em.flush();

    this.logger.log(
      `rescheduled planting disease reminder | occurrence=${plantingDisease.id} | nextCheckAt=${plantingDisease.nextCheckAt?.toISOString() ?? 'null'}`,
    );
  }

  async cancelPendingForPlantingDisease(plantingDiseaseId: string) {
    await this.cancelPending('disease', plantingDiseaseId);
  }

  async initializeForPestOccurrence(params: {
    user: User;
    planting: Planting;
    pest: Pest;
    pestOccurrence: PestOccurrence;
  }) {
    const { user, planting, pest, pestOccurrence } = params;

    if (pestOccurrence.status === PestOccurrenceStatus.RESOLVED) {
      pestOccurrence.nextCheckAt = null;
      pestOccurrence.reminderCount = 0;
      await this.cancelPending('pest', pestOccurrence.id);
      await this.em.flush();
      return;
    }

    await this.scheduleNextForOccurrence({
      kind: 'pest',
      occurrence: pestOccurrence,
      status: pestOccurrence.status,
      user,
      planting,
      pest,
      resetReminderCount: true,
    });

    await this.em.flush();

    this.logger.log(
      `scheduled pest reminder | occurrence=${pestOccurrence.id} | nextCheckAt=${pestOccurrence.nextCheckAt?.toISOString() ?? 'null'}`,
    );
  }

  async updateForPestOccurrenceStatusChange(params: {
    user: User;
    planting: Planting;
    pest: Pest;
    pestOccurrence: PestOccurrence;
    previousStatus: PestOccurrenceStatus;
  }) {
    const { user, planting, pest, pestOccurrence, previousStatus } = params;

    if (pestOccurrence.status === previousStatus) {
      return;
    }

    if (pestOccurrence.status === PestOccurrenceStatus.RESOLVED) {
      pestOccurrence.nextCheckAt = null;
      pestOccurrence.reminderCount = 0;
      await this.cancelPending('pest', pestOccurrence.id);
      await this.em.flush();

      this.logger.log(
        `resolved pest occurrence | occurrence=${pestOccurrence.id}`,
      );

      return;
    }

    await this.scheduleNextForOccurrence({
      kind: 'pest',
      occurrence: pestOccurrence,
      status: pestOccurrence.status,
      user,
      planting,
      pest,
      resetReminderCount: true,
    });

    await this.em.flush();

    this.logger.log(
      `rescheduled pest reminder | occurrence=${pestOccurrence.id} | nextCheckAt=${pestOccurrence.nextCheckAt?.toISOString() ?? 'null'}`,
    );
  }

  async cancelPendingForPestOccurrence(pestOccurrenceId: string) {
    await this.cancelPending('pest', pestOccurrenceId);
  }

  async upsertPendingForActionTask(params: {
    task: ActionTask;
    em?: EntityManager;
  }) {
    const em = params.em ?? this.em;

    if (params.task.status !== ActionTaskStatus.PENDING) {
      await this.cancelPendingForActionTask(params.task.id, em);
      return;
    }

    if (!params.task.dueAt) {
      await this.cancelPendingForActionTask(params.task.id, em);
      return;
    }

    await this.cancelPendingForActionTask(params.task.id, em);

    const reminder = new Reminder();
    reminder.user = params.task.user;
    reminder.type = ReminderType.ACTION_TASK_DUE;
    reminder.status = ReminderStatus.PENDING;
    reminder.scheduledAt = params.task.dueAt;
    reminder.payload = this.buildActionTaskPayload(params.task);
    reminder.actionTaskId = params.task.id;
    reminder.attempts = 0;
    reminder.lockedAt = null;
    reminder.lastError = null;

    em.persist(reminder);
  }

  async cancelPendingForActionTask(
    actionTaskId: string,
    em: EntityManager = this.em,
  ) {
    const updated = await em.nativeUpdate(
      Reminder,
      {
        actionTaskId,
        status: { $in: this.activeReminderStatuses },
      },
      {
        status: ReminderStatus.CANCELED,
        lockedAt: null,
        lastError: null,
      },
    );

    if (updated > 0) {
      this.logger.log(
        `canceled action-task reminders=${updated} | actionTask=${actionTaskId}`,
      );
    }
  }

  async handlePlantingDiseaseReminderSent(params: { reminderId: string }) {
    await this.em.transactional(async (em) => {
      const reminder = await em.findOne(Reminder, { id: params.reminderId });

      if (!reminder) {
        this.logger.warn(
          `planting disease reminder sent but reminder missing | reminder=${params.reminderId}`,
        );
        return;
      }

      if (!reminder.plantingDiseaseId) {
        this.logger.warn(
          `planting disease reminder sent but plantingDiseaseId missing | reminder=${params.reminderId}`,
        );
        return;
      }

      const occurrence = await em.findOne(
        PlantingDisease,
        { id: reminder.plantingDiseaseId },
        { populate: ['planting', 'disease'] },
      );

      if (!occurrence) {
        this.logger.warn(
          `planting disease reminder sent but occurrence missing | id=${reminder.plantingDiseaseId}`,
        );
        return;
      }

      if (occurrence.status === PlantingDiseaseStatus.RESOLVED) {
        occurrence.nextCheckAt = null;
        occurrence.reminderCount = 0;
        await this.cancelPending('disease', occurrence.id, em);
        await em.flush();
        return;
      }

      occurrence.reminderCount += 1;

      const maxReminders = this.getMaxReminders(occurrence.status);

      if (occurrence.reminderCount >= maxReminders) {
        occurrence.nextCheckAt = null;
        await this.cancelPending('disease', occurrence.id, em);
        await em.flush();

        this.logger.log(
          `planting disease reminders finished | occurrence=${occurrence.id}`,
        );
        return;
      }

      await this.scheduleNextForOccurrence({
        kind: 'disease',
        em,
        occurrence,
        status: occurrence.status,
        user: occurrence.planting.user,
        planting: occurrence.planting,
        disease: occurrence.disease,
        scheduledBaseTime: reminder.scheduledAt,
      });

      await em.flush();

      this.logger.log(
        `next planting disease reminder | occurrence=${occurrence.id} | nextCheckAt=${occurrence.nextCheckAt?.toISOString() ?? 'null'}`,
      );
    });
  }

  async handlePestOccurrenceReminderSent(params: { reminderId: string }) {
    await this.em.transactional(async (em) => {
      const reminder = await em.findOne(Reminder, { id: params.reminderId });

      if (!reminder) {
        this.logger.warn(
          `pest reminder sent but reminder missing | reminder=${params.reminderId}`,
        );
        return;
      }

      if (!reminder.pestOccurrenceId) {
        this.logger.warn(
          `pest reminder sent but pestOccurrenceId missing | reminder=${params.reminderId}`,
        );
        return;
      }

      const occurrence = await em.findOne(
        PestOccurrence,
        { id: reminder.pestOccurrenceId },
        { populate: ['planting', 'pest'] },
      );

      if (!occurrence) {
        this.logger.warn(
          `pest reminder sent but occurrence missing | id=${reminder.pestOccurrenceId}`,
        );
        return;
      }

      if (occurrence.status === PestOccurrenceStatus.RESOLVED) {
        occurrence.nextCheckAt = null;
        occurrence.reminderCount = 0;
        await this.cancelPending('pest', occurrence.id, em);
        await em.flush();
        return;
      }

      occurrence.reminderCount += 1;

      const maxReminders = this.getMaxReminders(occurrence.status);

      if (occurrence.reminderCount >= maxReminders) {
        occurrence.nextCheckAt = null;
        await this.cancelPending('pest', occurrence.id, em);
        await em.flush();

        this.logger.log(
          `pest reminders finished | occurrence=${occurrence.id}`,
        );
        return;
      }

      await this.scheduleNextForOccurrence({
        kind: 'pest',
        em,
        occurrence,
        status: occurrence.status,
        user: occurrence.planting.user,
        planting: occurrence.planting,
        pest: occurrence.pest,
        scheduledBaseTime: reminder.scheduledAt,
      });

      await em.flush();

      this.logger.log(
        `next pest reminder | occurrence=${occurrence.id} | nextCheckAt=${occurrence.nextCheckAt?.toISOString() ?? 'null'}`,
      );
    });
  }

  private buildDiseasePayload(
    planting: Planting,
    disease: Disease,
    plantingDisease: PlantingDisease,
    params: { action: ReminderAction },
  ): ReminderPayload {
    return {
      kind: 'disease',
      plantingId: planting.id,
      diseaseId: disease.id,
      plantingDiseaseId: plantingDisease.id,
      action: params.action,
    };
  }

  private buildPestPayload(
    planting: Planting,
    pest: Pest,
    pestOccurrence: PestOccurrence,
    params: { action: ReminderAction },
  ): ReminderPayload {
    return {
      kind: 'pest',
      plantingId: planting.id,
      pestId: pest.id,
      pestOccurrenceId: pestOccurrence.id,
      action: params.action,
    };
  }

  private buildActionTaskPayload(task: ActionTask): ReminderPayload {
    return {
      kind: 'action',
      actionTaskId: task.id,
      actionTemplateId: task.actionTemplate?.id,
      actionTemplateName: task.actionTemplate?.name ?? task.title,
      bedId: task.bed?.id,
      plantingId: task.planting?.id,
      action: ReminderAction.CHECK,
    };
  }

  private computeNextCheckAt(
    status: PlantingDiseaseStatus | PestOccurrenceStatus,
    baseTime: Date = new Date(),
  ) {
    const interval =
      status === PlantingDiseaseStatus.CONFIRMED ||
      status === PestOccurrenceStatus.CONFIRMED
        ? this.confirmedIntervalMs
        : this.suspectedIntervalMs;

    return new Date(baseTime.getTime() + interval);
  }

  private getMaxReminders(
    status: PlantingDiseaseStatus | PestOccurrenceStatus,
  ) {
    if (
      status === PlantingDiseaseStatus.CONFIRMED ||
      status === PestOccurrenceStatus.CONFIRMED
    ) {
      return this.maxRemindersConfirmed;
    }

    return this.maxRemindersSuspected;
  }

  private async scheduleNextForOccurrence(
    params:
      | {
          kind: 'disease';
          occurrence: PlantingDisease;
          status: PlantingDiseaseStatus;
          user: User;
          planting: Planting;
          disease: Disease;
          em?: EntityManager;
          scheduledBaseTime?: Date;
          resetReminderCount?: boolean;
        }
      | {
          kind: 'pest';
          occurrence: PestOccurrence;
          status: PestOccurrenceStatus;
          user: User;
          planting: Planting;
          pest: Pest;
          em?: EntityManager;
          scheduledBaseTime?: Date;
          resetReminderCount?: boolean;
        },
  ) {
    const em = params.em ?? this.em;

    if (
      params.status === PlantingDiseaseStatus.RESOLVED ||
      params.status === PestOccurrenceStatus.RESOLVED
    ) {
      params.occurrence.nextCheckAt = null;
      params.occurrence.reminderCount = 0;
      await this.cancelPending(params.kind, params.occurrence.id, em);
      return;
    }

    if (params.resetReminderCount) {
      params.occurrence.reminderCount = 0;
    }

    const nextCheckAt = this.computeNextCheckAt(
      params.status,
      params.scheduledBaseTime,
    );

    params.occurrence.nextCheckAt = nextCheckAt;

    await this.cancelPending(params.kind, params.occurrence.id, em);

    if (params.kind === 'disease') {
      this.createPending(
        params.kind,
        {
          user: params.user,
          occurrenceId: params.occurrence.id,
          type: ReminderType.DISEASE_CHECK,
          payload: this.buildDiseasePayload(
            params.planting,
            params.disease,
            params.occurrence,
            { action: ReminderAction.CHECK },
          ),
        },
        nextCheckAt,
        em,
      );
      return;
    }

    this.createPending(
      params.kind,
      {
        user: params.user,
        occurrenceId: params.occurrence.id,
        type: ReminderType.PEST_CHECK,
        payload: this.buildPestPayload(
          params.planting,
          params.pest,
          params.occurrence,
          { action: ReminderAction.CHECK },
        ),
      },
      nextCheckAt,
      em,
    );
  }

  private async cancelPending(
    kind: 'disease' | 'pest',
    occurrenceId: string,
    em: EntityManager = this.em,
  ) {
    const where =
      kind === 'disease'
        ? {
            plantingDiseaseId: occurrenceId,
            status: { $in: this.activeReminderStatuses },
          }
        : {
            pestOccurrenceId: occurrenceId,
            status: { $in: this.activeReminderStatuses },
          };

    const updated = await em.nativeUpdate(Reminder, where, {
      status: ReminderStatus.CANCELED,
      lockedAt: null,
      lastError: null,
    });

    if (updated > 0) {
      this.logger.log(
        `canceled ${kind} reminders=${updated} | occurrence=${occurrenceId}`,
      );
    }
  }

  private createPending(
    kind: 'disease' | 'pest',
    payload: {
      user: User;
      type: ReminderType;
      occurrenceId: string;
      payload: ReminderPayload;
    },
    scheduledAt: Date,
    em: EntityManager = this.em,
  ) {
    const reminder = new Reminder();
    reminder.user = payload.user;
    reminder.type = payload.type;
    reminder.status = ReminderStatus.PENDING;
    reminder.scheduledAt = scheduledAt;
    reminder.payload = payload.payload;
    reminder.attempts = 0;
    reminder.lockedAt = null;
    reminder.lastError = null;

    if (kind === 'disease') {
      reminder.plantingDiseaseId = payload.occurrenceId;
    } else {
      reminder.pestOccurrenceId = payload.occurrenceId;
    }

    em.persist(reminder);
  }

  private serialize(reminder: Reminder) {
    return {
      id: reminder.id,
      userId: reminder.user.id,
      scheduledAt: reminder.scheduledAt,
      status: reminder.status,
      type: reminder.type,
      payload: reminder.payload,
      plantingDiseaseId: reminder.plantingDiseaseId ?? null,
      pestOccurrenceId: reminder.pestOccurrenceId ?? null,
      actionTaskId: reminder.actionTaskId ?? null,
      sentAt: reminder.sentAt ?? null,
      attempts: reminder.attempts,
      lastError: reminder.lastError ?? null,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  }
}
