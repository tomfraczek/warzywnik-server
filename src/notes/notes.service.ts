import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Note } from './note.entity';
import { User } from '../users/user.entity';
import { EntitlementsService } from '../entitlements/entitlements.service';
import {
  CreateNoteDto,
  ListNotesQueryDto,
  UpdateNoteDto,
} from './dto/note.schemas';

@Injectable()
export class NotesService {
  constructor(
    private readonly em: EntityManager,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async list(user: User, query: ListNotesQueryDto) {
    const { page, limit, q } = query;

    const where: Record<string, unknown> = { user: user.id };

    if (q) {
      where.$or = [
        { title: { $ilike: `%${q}%` } },
        { content: { $ilike: `%${q}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(Note, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const isPremium = this.entitlementsService.isPremium(user);
    const limits = this.entitlementsService.getLimits(user);
    const maxAvailable = limits.notes;

    return {
      items: items.map((note, index) => ({
        ...this.serializeNote(note),
        accessStatus:
          isPremium || maxAvailable === null || index < maxAvailable
            ? 'available'
            : 'locked',
      })),
      page,
      limit,
      total,
    };
  }

  async getById(user: User, id: string) {
    const note = await this.em.findOne(Note, { id, user: user.id });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const accessStatus = await this.resolveNoteAccessStatus(user, note);

    return { ...this.serializeNote(note), accessStatus };
  }

  async create(user: User, dto: CreateNoteDto) {
    const isPremium = this.entitlementsService.isPremium(user);

    if (!isPremium) {
      const count = await this.em.count(Note, { user: user.id });
      if (count >= 5) {
        throw new HttpException(
          {
            code: 'PREMIUM_REQUIRED',
            message: 'This action requires Premium.',
            details: { reason: 'LIMIT_REACHED', limit: 'notes' },
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const note = new Note();
    note.user = user;
    note.title = dto.title ?? null;
    note.content = dto.content;

    await this.em.persistAndFlush(note);

    return { ...this.serializeNote(note), accessStatus: 'available' };
  }

  async update(user: User, id: string, dto: UpdateNoteDto) {
    const note = await this.em.findOne(Note, { id, user: user.id });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const accessStatus = await this.resolveNoteAccessStatus(user, note);

    if (accessStatus === 'locked') {
      throw new HttpException(
        {
          code: 'PREMIUM_REQUIRED',
          message: 'This resource is locked in the Free plan.',
          details: {
            reason: 'RESOURCE_LOCKED',
            resourceType: 'note',
            resourceId: id,
          },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;

    await this.em.flush();

    return { ...this.serializeNote(note), accessStatus };
  }

  async remove(user: User, id: string) {
    const note = await this.em.findOne(Note, { id, user: user.id });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    await this.em.removeAndFlush(note);
  }

  private async resolveNoteAccessStatus(
    user: User,
    note: Note,
  ): Promise<'available' | 'locked'> {
    if (this.entitlementsService.isPremium(user)) {
      return 'available';
    }

    const allNotes = await this.em.find(
      Note,
      { user: user.id },
      { fields: ['id'], orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    );

    const index = allNotes.findIndex((n) => n.id === note.id);

    if (index === -1 || index < 5) {
      return 'available';
    }

    return 'locked';
  }

  private serializeNote(note: Note) {
    return {
      id: note.id,
      title: note.title ?? null,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}
