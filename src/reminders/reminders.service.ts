import {
  ConflictException,
  Injectable,
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

export type ReminderPlanItem = {
  type: ReminderType;
  action: ReminderAction;
  offsetDays: number;
};

@Injectable()
export class RemindersService {
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

    const plan = this.getPlanForDisease(disease.slug);
    const now = new Date();

    const reminders = plan.map((item) => {
      const reminder = new Reminder();
      reminder.user = user;
      reminder.type = item.type;
      reminder.status = ReminderStatus.PENDING;
      reminder.scheduledAt = this.addDays(now, item.offsetDays);
      reminder.payload = this.buildPayload(planting, disease, plantingDisease, {
        action: item.action,
      });
      return reminder;
    });

    if (reminders.length === 0) {
      return [];
    }

    await this.em.persistAndFlush(reminders);
    return reminders.map((reminder) => this.serialize(reminder));
  }

  async cancelPendingForPlantingDisease(plantingDiseaseId: string) {
    const reminders = await this.em.find(Reminder, {
      status: ReminderStatus.PENDING,
      payload: { $contains: { plantingDiseaseId } },
    });

    if (reminders.length === 0) {
      return;
    }

    for (const reminder of reminders) {
      reminder.status = ReminderStatus.CANCELED;
    }

    await this.em.flush();
  }

  private buildPayload(
    planting: Planting,
    disease: Disease,
    plantingDisease: PlantingDisease,
    params: { action: ReminderAction },
  ): ReminderPayload {
    return {
      plantingId: planting.id,
      diseaseId: disease.id,
      plantingDiseaseId: plantingDisease.id,
      action: params.action,
    };
  }

  private getPlanForDisease(slug: string): ReminderPlanItem[] {
    const plans: Record<string, ReminderPlanItem[]> = {
      // Example of disease-specific plan:
      // 'zaraza-ziemniaczana': [
      //   { type: ReminderType.DISEASE_CHECK, action: ReminderAction.CHECK, offsetDays: 1 },
      //   { type: ReminderType.DISEASE_TREATMENT, action: ReminderAction.TREAT, offsetDays: 3 },
      // ],
    };

    return (
      plans[slug] ?? [
        {
          type: ReminderType.DISEASE_CHECK,
          action: ReminderAction.CHECK,
          offsetDays: 2,
        },
      ]
    );
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private serialize(reminder: Reminder) {
    return {
      id: reminder.id,
      userId: reminder.user.id,
      scheduledAt: reminder.scheduledAt,
      status: reminder.status,
      type: reminder.type,
      payload: reminder.payload,
      sentAt: reminder.sentAt ?? null,
      attempts: reminder.attempts,
      lastError: reminder.lastError ?? null,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  }
}
