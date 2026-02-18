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
import { Bed } from '../beds/bed.entity';
import { PestOccurrence } from '../pest-occurrences/pest-occurrence.entity';
import { PestOccurrenceStatus } from '../common/enums/pest-occurrence.enums';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  private readonly suspectedIntervalMs = 24 * 60 * 60 * 1000;
  private readonly confirmedIntervalMs = 48 * 60 * 60 * 1000;
  private readonly maxRemindersSuspected = 3;
  private readonly maxRemindersConfirmed = 2;

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
      await this.em.flush();
      return [];
    }

    const nextCheckAt = this.computeNextCheckAt(plantingDisease.status);

    plantingDisease.nextCheckAt = nextCheckAt;
    plantingDisease.reminderCount = 0;

    await this.upsertPendingReminderForPlantingDisease({
      user,
      planting,
      disease,
      plantingDisease,
      scheduledAt: nextCheckAt,
    });

    await this.em.flush();

    this.logger.log(
      `scheduled planting disease reminder | occurrence=${plantingDisease.id} | nextCheckAt=${nextCheckAt.toISOString()}`,
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
      await this.cancelPendingForPlantingDisease(plantingDisease.id);
      await this.em.flush();

      this.logger.log(
        `resolved planting disease | occurrence=${plantingDisease.id}`,
      );

      return;
    }

    const nextCheckAt = this.computeNextCheckAt(plantingDisease.status);
    plantingDisease.nextCheckAt = nextCheckAt;
    plantingDisease.reminderCount = 0;

    await this.upsertPendingReminderForPlantingDisease({
      user,
      planting,
      disease,
      plantingDisease,
      scheduledAt: nextCheckAt,
    });

    await this.em.flush();

    this.logger.log(
      `rescheduled planting disease reminder | occurrence=${plantingDisease.id} | nextCheckAt=${nextCheckAt.toISOString()}`,
    );
  }

  async cancelPendingForPlantingDisease(plantingDiseaseId: string) {
    const updated = await this.em.nativeUpdate(
      Reminder,
      {
        plantingDiseaseId,
        status: {
          $in: [ReminderStatus.PENDING, ReminderStatus.PROCESSING],
        },
      },
      {
        status: ReminderStatus.CANCELED,
        lockedAt: null,
      },
    );

    if (updated > 0) {
      this.logger.log(
        `canceled planting disease reminders=${updated} | occurrence=${plantingDiseaseId}`,
      );
    }
  }

  async initializeForPestOccurrence(params: {
    user: User;
    bed: Bed;
    pest: Pest;
    pestOccurrence: PestOccurrence;
  }) {
    const { user, bed, pest, pestOccurrence } = params;

    if (pestOccurrence.status === PestOccurrenceStatus.RESOLVED) {
      pestOccurrence.nextCheckAt = null;
      pestOccurrence.reminderCount = 0;
      await this.em.flush();
      return;
    }

    const nextCheckAt = this.computeNextCheckAt(pestOccurrence.status);

    pestOccurrence.nextCheckAt = nextCheckAt;
    pestOccurrence.reminderCount = 0;

    await this.upsertPendingReminderForPestOccurrence({
      user,
      bed,
      pest,
      pestOccurrence,
      scheduledAt: nextCheckAt,
    });

    await this.em.flush();

    this.logger.log(
      `scheduled pest reminder | occurrence=${pestOccurrence.id} | nextCheckAt=${nextCheckAt.toISOString()}`,
    );
  }

  async updateForPestOccurrenceStatusChange(params: {
    user: User;
    bed: Bed;
    pest: Pest;
    pestOccurrence: PestOccurrence;
    previousStatus: PestOccurrenceStatus;
  }) {
    const { user, bed, pest, pestOccurrence, previousStatus } = params;

    if (pestOccurrence.status === previousStatus) {
      return;
    }

    if (pestOccurrence.status === PestOccurrenceStatus.RESOLVED) {
      pestOccurrence.nextCheckAt = null;
      pestOccurrence.reminderCount = 0;
      await this.cancelPendingForPestOccurrence(pestOccurrence.id);
      await this.em.flush();

      this.logger.log(
        `resolved pest occurrence | occurrence=${pestOccurrence.id}`,
      );

      return;
    }

    const nextCheckAt = this.computeNextCheckAt(pestOccurrence.status);
    pestOccurrence.nextCheckAt = nextCheckAt;
    pestOccurrence.reminderCount = 0;

    await this.upsertPendingReminderForPestOccurrence({
      user,
      bed,
      pest,
      pestOccurrence,
      scheduledAt: nextCheckAt,
    });

    await this.em.flush();

    this.logger.log(
      `rescheduled pest reminder | occurrence=${pestOccurrence.id} | nextCheckAt=${nextCheckAt.toISOString()}`,
    );
  }

  async cancelPendingForPestOccurrence(pestOccurrenceId: string) {
    const updated = await this.em.nativeUpdate(
      Reminder,
      {
        pestOccurrenceId,
        status: {
          $in: [ReminderStatus.PENDING, ReminderStatus.PROCESSING],
        },
      },
      {
        status: ReminderStatus.CANCELED,
        lockedAt: null,
      },
    );

    if (updated > 0) {
      this.logger.log(
        `canceled pest reminders=${updated} | occurrence=${pestOccurrenceId}`,
      );
    }
  }

  async handlePlantingDiseaseReminderSent(plantingDiseaseId: string) {
    const occurrence = await this.em.findOne(
      PlantingDisease,
      { id: plantingDiseaseId },
      { populate: ['planting', 'disease'] },
    );

    if (!occurrence) {
      this.logger.warn(
        `planting disease reminder sent but occurrence missing | id=${plantingDiseaseId}`,
      );
      return;
    }

    if (occurrence.status === PlantingDiseaseStatus.RESOLVED) {
      occurrence.nextCheckAt = null;
      occurrence.reminderCount = 0;
      await this.cancelPendingForPlantingDisease(occurrence.id);
      await this.em.flush();
      return;
    }

    occurrence.reminderCount += 1;

    const maxReminders = this.getMaxReminders(occurrence.status);

    if (occurrence.reminderCount >= maxReminders) {
      occurrence.nextCheckAt = null;
      await this.cancelPendingForPlantingDisease(occurrence.id);
      await this.em.flush();

      this.logger.log(
        `planting disease reminders finished | occurrence=${occurrence.id}`,
      );
      return;
    }

    const nextCheckAt = this.computeNextCheckAt(occurrence.status);
    occurrence.nextCheckAt = nextCheckAt;

    await this.upsertPendingReminderForPlantingDisease({
      user: occurrence.planting.user,
      planting: occurrence.planting,
      disease: occurrence.disease,
      plantingDisease: occurrence,
      scheduledAt: nextCheckAt,
    });

    await this.em.flush();

    this.logger.log(
      `next planting disease reminder | occurrence=${occurrence.id} | nextCheckAt=${nextCheckAt.toISOString()}`,
    );
  }

  async handlePestOccurrenceReminderSent(pestOccurrenceId: string) {
    const occurrence = await this.em.findOne(
      PestOccurrence,
      { id: pestOccurrenceId },
      { populate: ['bed', 'pest'] },
    );

    if (!occurrence) {
      this.logger.warn(
        `pest reminder sent but occurrence missing | id=${pestOccurrenceId}`,
      );
      return;
    }

    if (occurrence.status === PestOccurrenceStatus.RESOLVED) {
      occurrence.nextCheckAt = null;
      occurrence.reminderCount = 0;
      await this.cancelPendingForPestOccurrence(occurrence.id);
      await this.em.flush();
      return;
    }

    occurrence.reminderCount += 1;

    const maxReminders = this.getMaxReminders(occurrence.status);

    if (occurrence.reminderCount >= maxReminders) {
      occurrence.nextCheckAt = null;
      await this.cancelPendingForPestOccurrence(occurrence.id);
      await this.em.flush();

      this.logger.log(`pest reminders finished | occurrence=${occurrence.id}`);
      return;
    }

    const nextCheckAt = this.computeNextCheckAt(occurrence.status);
    occurrence.nextCheckAt = nextCheckAt;

    await this.upsertPendingReminderForPestOccurrence({
      user: occurrence.bed.user,
      bed: occurrence.bed,
      pest: occurrence.pest,
      pestOccurrence: occurrence,
      scheduledAt: nextCheckAt,
    });

    await this.em.flush();

    this.logger.log(
      `next pest reminder | occurrence=${occurrence.id} | nextCheckAt=${nextCheckAt.toISOString()}`,
    );
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
    bed: Bed,
    pest: Pest,
    pestOccurrence: PestOccurrence,
    params: { action: ReminderAction },
  ): ReminderPayload {
    return {
      kind: 'pest',
      bedId: bed.id,
      pestId: pest.id,
      pestOccurrenceId: pestOccurrence.id,
      action: params.action,
    };
  }

  private computeNextCheckAt(
    status: PlantingDiseaseStatus | PestOccurrenceStatus,
  ) {
    const interval =
      status === PlantingDiseaseStatus.CONFIRMED ||
      status === PestOccurrenceStatus.CONFIRMED
        ? this.confirmedIntervalMs
        : this.suspectedIntervalMs;

    return new Date(Date.now() + interval);
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

  private async upsertPendingReminderForPlantingDisease(params: {
    user: User;
    planting: Planting;
    disease: Disease;
    plantingDisease: PlantingDisease;
    scheduledAt: Date;
  }) {
    const { user, planting, disease, plantingDisease, scheduledAt } = params;

    const existing = await this.em.findOne(Reminder, {
      status: ReminderStatus.PENDING,
      plantingDiseaseId: plantingDisease.id,
    });

    if (existing) {
      existing.scheduledAt = scheduledAt;
      existing.type = ReminderType.DISEASE_CHECK;
      existing.payload = this.buildDiseasePayload(
        planting,
        disease,
        plantingDisease,
        { action: ReminderAction.CHECK },
      );
      return;
    }

    const reminder = new Reminder();
    reminder.user = user;
    reminder.type = ReminderType.DISEASE_CHECK;
    reminder.status = ReminderStatus.PENDING;
    reminder.scheduledAt = scheduledAt;
    reminder.payload = this.buildDiseasePayload(
      planting,
      disease,
      plantingDisease,
      { action: ReminderAction.CHECK },
    );
    reminder.plantingDiseaseId = plantingDisease.id;

    this.em.persist(reminder);
  }

  private async upsertPendingReminderForPestOccurrence(params: {
    user: User;
    bed: Bed;
    pest: Pest;
    pestOccurrence: PestOccurrence;
    scheduledAt: Date;
  }) {
    const { user, bed, pest, pestOccurrence, scheduledAt } = params;

    const existing = await this.em.findOne(Reminder, {
      status: ReminderStatus.PENDING,
      pestOccurrenceId: pestOccurrence.id,
    });

    if (existing) {
      existing.scheduledAt = scheduledAt;
      existing.type = ReminderType.PEST_CHECK;
      existing.payload = this.buildPestPayload(bed, pest, pestOccurrence, {
        action: ReminderAction.CHECK,
      });
      return;
    }

    const reminder = new Reminder();
    reminder.user = user;
    reminder.type = ReminderType.PEST_CHECK;
    reminder.status = ReminderStatus.PENDING;
    reminder.scheduledAt = scheduledAt;
    reminder.payload = this.buildPestPayload(bed, pest, pestOccurrence, {
      action: ReminderAction.CHECK,
    });
    reminder.pestOccurrenceId = pestOccurrence.id;

    this.em.persist(reminder);
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
      sentAt: reminder.sentAt ?? null,
      attempts: reminder.attempts,
      lastError: reminder.lastError ?? null,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  }
}
