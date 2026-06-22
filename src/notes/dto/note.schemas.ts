import { z } from 'zod';

export type CreateNoteDto = {
  title?: string | null;
  content: string;
};

export type UpdateNoteDto = {
  title?: string | null;
  content?: string;
};

export type ListNotesQueryDto = {
  page: number;
  limit: number;
  q?: string;
};

export const createNoteSchema = z.object({
  title: z.string().min(1).max(200).nullable().optional(),
  content: z.string().min(1),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).nullable().optional(),
  content: z.string().min(1).optional(),
});

export const listNotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
});
