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

export const createPestOccurrenceSchema = z.object({
  pestId: z.string().uuid(),
  status: z.nativeEnum(PestOccurrenceStatus).optional(),
  notes: z.string().min(1).nullable().optional(),
});

export const updatePestOccurrenceSchema = z.object({
  status: z.nativeEnum(PestOccurrenceStatus).optional(),
  notes: z.string().min(1).nullable().optional(),
});
