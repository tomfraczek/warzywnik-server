import { z } from 'zod';
import { CultivationEnvironment } from '../../common/enums/bed.enums';

export type BedBaseDto = {
  name?: string;
  description?: string | null;
  locationLabel?: string | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  soilId?: string | null;
  soil?: string | null;
  growingSpaceId?: string;
  soilTestingEnabled?: boolean;
  measuredN?: number | null;
  measuredP?: number | null;
  measuredK?: number | null;
  measuredPh?: number | null;
  isActive?: boolean;
  cultivationEnvironment?: CultivationEnvironment;
};

export type CreateBedDto = BedBaseDto & {
  name: string;
};

export type UpdateBedDto = BedBaseDto;

export type ListBedsQueryDto = {
  page: number;
  limit: number;
  q?: string;
  isActive?: boolean;
};

const nameSchema = z.string().min(1).max(120);
const optionalLabelSchema = z.string().min(1).max(120).nullable();
const positiveIntSchema = z.number().int().min(1);
const percentageSchema = z.number().int().min(0).max(100);
const phSchema = z.number().min(0).max(14);

const baseBedSchema = z.object({
  name: nameSchema.optional(),
  description: z.string().min(1).nullable().optional(),
  locationLabel: optionalLabelSchema.optional(),
  lengthCm: positiveIntSchema.nullable().optional(),
  widthCm: positiveIntSchema.nullable().optional(),
  depthCm: positiveIntSchema.nullable().optional(),
  soilId: z.string().uuid().nullable().optional(),
  soil: z.string().uuid().nullable().optional(),
  growingSpaceId: z.string().uuid().optional(),
  soilTestingEnabled: z.boolean().optional(),
  measuredN: percentageSchema.nullable().optional(),
  measuredP: percentageSchema.nullable().optional(),
  measuredK: percentageSchema.nullable().optional(),
  measuredPh: phSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  cultivationEnvironment: z.nativeEnum(CultivationEnvironment).optional(),
});

export const createBedSchema = baseBedSchema.extend({
  name: baseBedSchema.shape.name.unwrap(),
});

export const updateBedSchema = baseBedSchema;

export const listBedsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
  isActive: z.coerce.boolean().optional(),
});
