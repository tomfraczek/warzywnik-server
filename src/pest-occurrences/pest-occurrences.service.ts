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
  UpdatePestOccurrenceDto,
} from './dto/pest-occurrence.schemas';
import { Bed } from '../beds/bed.entity';
import { Pest } from '../pests/pest.entity';
import { User } from '../users/user.entity';
import { PestOccurrenceStatus } from '../common/enums/pest-occurrence.enums';
import { RemindersService } from '../reminders/reminders.service';

@Injectable()
export class PestOccurrencesService {
  private readonly logger = new Logger(PestOccurrencesService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly remindersService: RemindersService,
  ) {}

  async list(user: User, bedId: string) {
    const bed = await this.getBedOrThrow(user, bedId);

    const items = await this.em.find(
      PestOccurrence,
      { bed: bed.id },
      {
        populate: ['pest'],
        orderBy: { createdAt: 'desc' },
      },
    );

    return items.map((item) => this.serialize(item));
  }

  async create(user: User, bedId: string, dto: CreatePestOccurrenceDto) {
    const bed = await this.getBedOrThrow(user, bedId);

    const pest = await this.em.findOne(Pest, { id: dto.pestId });
    if (!pest) {
      throw new NotFoundException('Pest not found');
    }

    const existing = await this.em.findOne(PestOccurrence, {
      bed: bed.id,
      pest: pest.id,
      status: { $ne: PestOccurrenceStatus.RESOLVED },
    });

    if (existing) {
      throw new ConflictException('Active pest occurrence already exists');
    }

    const occurrence = new PestOccurrence();
    occurrence.bed = bed;
    occurrence.pest = pest;
    occurrence.status = dto.status ?? PestOccurrenceStatus.SUSPECTED;
    occurrence.notes = dto.notes ?? null;

    await this.em.persistAndFlush(occurrence);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.remindersService.initializeForPestOccurrence({
      user,
      bed,
      pest,
      pestOccurrence: occurrence,
    });

    await this.em.populate(occurrence, ['pest']);

    this.logger.log(
      `created pest occurrence=${occurrence.id} | bed=${bed.id} | pest=${pest.id} | status=${occurrence.status}`,
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await this.remindersService.updateForPestOccurrenceStatusChange({
        user,
        bed: occurrence.bed,
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.remindersService.cancelPendingForPestOccurrence(occurrence.id);

    await this.em.removeAndFlush(occurrence);

    this.logger.log(`deleted pest occurrence=${occurrence.id}`);
  }

  private async getBedOrThrow(user: User, bedId: string) {
    const bed = await this.em.findOne(Bed, { id: bedId, user: user.id });

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    return bed;
  }

  private async getOccurrenceOrThrow(user: User, id: string) {
    const occurrence = await this.em.findOne(
      PestOccurrence,
      { id },
      { populate: ['bed', 'pest'] },
    );

    if (!occurrence || occurrence.bed.user.id !== user.id) {
      throw new NotFoundException('Pest occurrence not found');
    }

    return occurrence;
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
      bed: occurrence.bed.id,
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
      bedId: entity.bed.id,
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
