import { z } from 'zod';
import { ContactMessageCategory } from '../contact-message-category.enum';

export const createContactMessageSchema = z.object({
  category: z.nativeEnum(ContactMessageCategory),
  content: z.string().trim().min(1).max(5000),
});

export const listAdminContactMessagesQuerySchema = z.object({
  category: z.nativeEnum(ContactMessageCategory).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateContactMessageDto = z.infer<
  typeof createContactMessageSchema
>;
export type ListAdminContactMessagesQueryDto = z.infer<
  typeof listAdminContactMessagesQuerySchema
>;
