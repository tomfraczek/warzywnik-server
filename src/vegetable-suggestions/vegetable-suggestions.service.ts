import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { VegetableSuggestion } from './vegetable-suggestion.entity';
import { MailService } from '../mail/mail.service';
import {
  CreateVegetableSuggestionDto,
  ListAdminVegetableSuggestionsQueryDto,
} from './dto/vegetable-suggestion.schemas';

@Injectable()
export class VegetableSuggestionsService {
  constructor(
    private readonly em: EntityManager,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateVegetableSuggestionDto, userId: string | null) {
    const suggestion = new VegetableSuggestion();
    suggestion.name = dto.name;
    suggestion.note = dto.note ?? null;
    suggestion.userId = userId;

    await this.em.persistAndFlush(suggestion);

    void this.mailService.sendVegetableSuggestionNotification(suggestion.name);

    return {
      id: suggestion.id,
      name: suggestion.name,
      note: suggestion.note ?? null,
      createdAt: suggestion.createdAt.toISOString(),
    };
  }

  async listAdmin(query: ListAdminVegetableSuggestionsQueryDto) {
    const { search, page, limit } = query;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { $ilike: `%${search}%` };
    }

    const [items, total] = await this.em.findAndCount(
      VegetableSuggestion,
      where,
      {
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      },
    );

    return {
      items: items.map((s) => ({
        id: s.id,
        name: s.name,
        note: s.note ?? null,
        userId: s.userId ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async delete(id: string): Promise<void> {
    const suggestion = await this.em.findOne(VegetableSuggestion, { id });
    if (!suggestion) {
      throw new NotFoundException(`VegetableSuggestion ${id} not found`);
    }
    await this.em.removeAndFlush(suggestion);
  }
}
