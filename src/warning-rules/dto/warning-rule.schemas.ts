import { z } from 'zod';
import {
  WarningCode,
  WarningRuleCategory,
  WarningRuleDayPart,
  WarningRuleHorizon,
  WarningSeverity,
} from '../../common/enums/warning.enums';

export type WarningRuleBaseDto = {
  code?: WarningCode;
  enabled?: boolean;
  category?: WarningRuleCategory;
  horizon?: WarningRuleHorizon;
  dayPart?: WarningRuleDayPart;
  generatesTask?: boolean;
  severity?: WarningSeverity;
  title?: string;
  messageTemplate?: string;
  hintTemplate?: string | null;
  blocking?: boolean;
  cooldownDays?: number | null;
  isActive?: boolean;
};

export type CreateWarningRuleDto = WarningRuleBaseDto & {
  code: WarningCode;
  title: string;
  messageTemplate: string;
};

export type UpdateWarningRuleDto = WarningRuleBaseDto;

export type ListWarningRulesQueryDto = {
  page: number;
  limit: number;
  q?: string;
  enabled?: boolean;
  severity?: WarningSeverity;
  category?: WarningRuleCategory;
  horizon?: WarningRuleHorizon;
  dayPart?: WarningRuleDayPart;
  generatesTask?: boolean;
};

const titleSchema = z.string().min(1).max(120);
const messageTemplateSchema = z.string().min(1);

const baseWarningRuleSchema = z.object({
  code: z.nativeEnum(WarningCode).optional(),
  enabled: z.boolean().optional(),
  category: z.nativeEnum(WarningRuleCategory).optional(),
  horizon: z.nativeEnum(WarningRuleHorizon).optional(),
  dayPart: z.nativeEnum(WarningRuleDayPart).optional(),
  generatesTask: z.boolean().optional(),
  severity: z.nativeEnum(WarningSeverity).optional(),
  title: titleSchema.optional(),
  messageTemplate: messageTemplateSchema.optional(),
  hintTemplate: z.string().min(1).nullable().optional(),
  blocking: z.boolean().optional(),
  cooldownDays: z.coerce.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createWarningRuleSchema = baseWarningRuleSchema.extend({
  code: baseWarningRuleSchema.shape.code.unwrap(),
  title: baseWarningRuleSchema.shape.title.unwrap(),
  messageTemplate: baseWarningRuleSchema.shape.messageTemplate.unwrap(),
});

export const updateWarningRuleSchema = baseWarningRuleSchema;

export const listWarningRulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().min(1).optional(),
  enabled: z.coerce.boolean().optional(),
  severity: z.nativeEnum(WarningSeverity).optional(),
  category: z.nativeEnum(WarningRuleCategory).optional(),
  horizon: z.nativeEnum(WarningRuleHorizon).optional(),
  dayPart: z.nativeEnum(WarningRuleDayPart).optional(),
  generatesTask: z.coerce.boolean().optional(),
});
