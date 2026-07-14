import { Entity, Enum, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { ContactMessageCategory } from './contact-message-category.enum';

@Entity({ tableName: 'contact_messages' })
@Index({ properties: ['createdAt'] })
@Index({ properties: ['category'] })
@Index({ properties: ['userId'] })
export class ContactMessage {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Enum({ items: () => ContactMessageCategory })
  category!: ContactMessageCategory;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Property({ length: 255, nullable: true })
  userEmail?: string | null;

  @Property({ length: 255, nullable: true })
  userDisplayName?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
