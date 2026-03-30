import { z } from 'zod';
import { PestOccurrenceStatus } from '../../common/enums/pest-occurrence.enums';

export type CreatePestOccurrenceDto = {
  pestId: string;
  status?: PestOccurrenceStatus;
  notes?: string | null;
};

export type UpdatePestOccurrenceDto = {
  status?: PestOccurrenceStatus;
  notes?: string | null;
};

export type ListPestOccurrencesQueryDto = {
  status: 'active' | 'resolved' | 'all';
};

export const createPestOccurrenceSchema = z.object({
  pestId: z.string().min(1).max(180),
  status: z.nativeEnum(PestOccurrenceStatus).optional(),
  notes: z.string().min(1).nullable().optional(),
});

export const updatePestOccurrenceSchema = z.object({
  status: z.nativeEnum(PestOccurrenceStatus).optional(),
  notes: z.string().min(1).nullable().optional(),
});

export const listPestOccurrencesQuerySchema = z.object({
  status: z.enum(['active', 'resolved', 'all']).default('active'),
});
