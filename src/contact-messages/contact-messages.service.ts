import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ContactMessage } from './contact-message.entity';
import { MailService } from '../mail/mail.service';
import {
  CreateContactMessageDto,
  ListAdminContactMessagesQueryDto,
} from './dto/contact-message.schemas';

type ContactMessageSender = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

@Injectable()
export class ContactMessagesService {
  constructor(
    private readonly em: EntityManager,
    private readonly mailService: MailService,
  ) {}

  async create(
    dto: CreateContactMessageDto,
    sender: ContactMessageSender | null,
  ) {
    const message = new ContactMessage();
    message.category = dto.category;
    message.content = dto.content;
    message.userId = sender?.id ?? null;
    message.userEmail = sender?.email ?? null;
    message.userDisplayName = sender?.displayName ?? null;

    await this.em.persistAndFlush(message);

    void this.mailService.sendContactMessageNotification({
      category: message.category,
      content: message.content,
      userEmail: message.userEmail,
      userDisplayName: message.userDisplayName,
    });

    return this.serialize(message);
  }

  async listAdmin(query: ListAdminContactMessagesQueryDto) {
    const { category, search, page, limit } = query;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }
    if (search) {
      where.content = { $ilike: `%${search}%` };
    }

    const [items, total] = await this.em.findAndCount(ContactMessage, where, {
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    return {
      items: items.map((message) => this.serialize(message)),
      total,
      page,
      limit,
    };
  }

  async getByIdAdmin(id: string) {
    const message = await this.em.findOne(ContactMessage, { id });
    if (!message) {
      throw new NotFoundException(`ContactMessage ${id} not found`);
    }
    return this.serialize(message);
  }

  async delete(id: string): Promise<void> {
    const message = await this.em.findOne(ContactMessage, { id });
    if (!message) {
      throw new NotFoundException(`ContactMessage ${id} not found`);
    }
    await this.em.removeAndFlush(message);
  }

  private serialize(message: ContactMessage) {
    return {
      id: message.id,
      category: message.category,
      content: message.content,
      userId: message.userId ?? null,
      userEmail: message.userEmail ?? null,
      userDisplayName: message.userDisplayName ?? null,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }
}
