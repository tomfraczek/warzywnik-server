import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { PestOccurrence } from './pest-occurrence.entity';
import {
  CreatePestOccurrenceDto,
  ListPestOccurrencesQueryDto,
  UpdatePestOccurrenceDto,
} from './dto/pest-occurrence.schemas';
import { Planting } from '../plantings/planting.entity';
import { Pest } from '../pests/pest.entity';
import { User } from '../users/user.entity';
import { PestOccurrenceStatus } from '../common/enums/pest-occurrence.enums';
import { RemindersService } from '../reminders/reminders.service';
import { ActionTemplate } from '../action-templates/action-template.entity';

type PestOccurrenceReminderApi = {
  initializeForPestOccurrence(params: {
    user: User;
    planting: Planting;
    pest: Pest;
    pestOccurrence: PestOccurrence;
  }): Promise<void>;
  updateForPestOccurrenceStatusChange(params: {
    user: User;
    planting: Planting;
    pest: Pest;
    pestOccurrence: PestOccurrence;
    previousStatus: PestOccurrenceStatus;
  }): Promise<void>;
  cancelPendingForPestOccurrence(pestOccurrenceId: string): Promise<void>;
};

@Injectable()
export class PestOccurrencesService {
  private readonly logger = new Logger(PestOccurrencesService.name);
  private readonly remindersApi: PestOccurrenceReminderApi;

  constructor(
    private readonly em: EntityManager,
    private readonly remindersService: RemindersService,
  ) {
    this.remindersApi = remindersService;
  }

  async list(
    user: User,
    plantingId: string,
    query: ListPestOccurrencesQueryDto,
  ) {
    const planting = await this.getPlantingOrThrow(user, plantingId);

    const where: Record<string, unknown> = {
      planting: planting.id,
    };

    if (query.status === 'active') {
      where.status = { $ne: PestOccurrenceStatus.RESOLVED };
    } else if (query.status === 'resolved') {
      where.status = PestOccurrenceStatus.RESOLVED;
    }

    const items = await this.em.find(PestOccurrence, where, {
      populate: ['pest'],
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.serialize(item));
  }

  async create(user: User, plantingId: string, dto: CreatePestOccurrenceDto) {
    const planting = await this.getPlantingOrThrow(user, plantingId);

    const pest = await this.em.findOne(Pest, { id: dto.pestId });
    if (!pest) {
      throw new NotFoundException('Pest not found');
    }

    const existing = await this.em.findOne(PestOccurrence, {
      planting: planting.id,
      pest: pest.id,
      status: { $ne: PestOccurrenceStatus.RESOLVED },
    });

    if (existing) {
      throw new ConflictException('Active pest occurrence already exists');
    }

    const occurrence = new PestOccurrence();
    occurrence.planting = planting;
    occurrence.pest = pest;
    occurrence.status = dto.status ?? PestOccurrenceStatus.SUSPECTED;
    occurrence.notes = dto.notes ?? null;

    await this.em.persistAndFlush(occurrence);

    await this.remindersApi.initializeForPestOccurrence({
      user,
      planting,
      pest,
      pestOccurrence: occurrence,
    });

    await this.em.populate(occurrence, ['pest']);

    this.logger.log(
      `created pest occurrence=${occurrence.id} | planting=${planting.id} | pest=${pest.id} | status=${occurrence.status}`,
    );

    return this.serialize(occurrence);
  }

  async update(user: User, id: string, dto: UpdatePestOccurrenceDto) {
    const occurrence = await this.getOccurrenceOrThrow(user, id);

    const previousStatus = occurrence.status;

    if (dto.status !== undefined && dto.status !== occurrence.status) {
      if (dto.status !== PestOccurrenceStatus.RESOLVED) {
        await this.ensureNoActiveDuplicate(occurrence, dto.status);
      }

      occurrence.status = dto.status;

      await this.remindersApi.updateForPestOccurrenceStatusChange({
        user,
        planting: occurrence.planting,
        pest: occurrence.pest,
        pestOccurrence: occurrence,
        previousStatus,
      });
    }

    if (dto.notes !== undefined) {
      occurrence.notes = dto.notes;
    }

    await this.em.flush();

    this.logger.log(
      `updated pest occurrence=${occurrence.id} | status=${occurrence.status}`,
    );

    return this.serialize(occurrence);
  }

  async remove(user: User, id: string) {
    const occurrence = await this.getOccurrenceOrThrow(user, id);

    await this.remindersApi.cancelPendingForPestOccurrence(occurrence.id);

    await this.em.removeAndFlush(occurrence);

    this.logger.log(`deleted pest occurrence=${occurrence.id}`);
  }

  async getRecommendedActions(user: User, id: string) {
    const occurrence = await this.getOccurrenceOrThrow(user, id, true);

    return {
      occurrenceId: occurrence.id,
      kind: 'pest',
      plantingId: occurrence.planting.id,
      pest: {
        id: occurrence.pest.id,
        name: occurrence.pest.name,
        slug: occurrence.pest.slug,
      },
      actions: occurrence.pest.recommendedActions
        .getItems()
        .map((item) => this.serializeActionTemplate(item)),
    };
  }

  private async getPlantingOrThrow(user: User, plantingId: string) {
    const planting = await this.em.findOne(Planting, {
      id: plantingId,
      user: user.id,
    });

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    return planting;
  }

  private async getOccurrenceOrThrow(
    user: User,
    id: string,
    includeRecommendedActions = false,
  ) {
    const occurrence = await this.em.findOne(
      PestOccurrence,
      { id },
      {
        populate: includeRecommendedActions
          ? ['planting', 'pest', 'pest.recommendedActions']
          : ['planting', 'pest'],
      },
    );

    if (!occurrence || occurrence.planting.user.id !== user.id) {
      throw new NotFoundException('Pest occurrence not found');
    }

    return occurrence;
  }

  private serializeActionTemplate(template: ActionTemplate) {
    return {
      id: template.id,
      slug: template.slug,
      name: template.name,
      description: template.description ?? null,
      target: template.target,
      type: template.type,
      defaultDueOffsetDays: template.defaultDueOffsetDays,
    };
  }

  private async ensureNoActiveDuplicate(
    occurrence: PestOccurrence,
    newStatus: PestOccurrenceStatus,
  ) {
    if (newStatus === PestOccurrenceStatus.RESOLVED) {
      return;
    }

    const existing = await this.em.findOne(PestOccurrence, {
      id: { $ne: occurrence.id },
      planting: occurrence.planting.id,
      pest: occurrence.pest.id,
      status: { $ne: PestOccurrenceStatus.RESOLVED },
    });

    if (existing) {
      throw new ConflictException('Active pest occurrence already exists');
    }
  }

  private serialize(entity: PestOccurrence) {
    return {
      id: entity.id,
      plantingId: entity.planting.id,
      pest: entity.pest
        ? {
            id: entity.pest.id,
            slug: entity.pest.slug,
            name: entity.pest.name,
          }
        : null,
      status: entity.status,
      notes: entity.notes ?? null,
      reminderCount: entity.reminderCount,
      nextCheckAt: entity.nextCheckAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
