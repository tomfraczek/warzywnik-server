import { z } from 'zod';

export const createCompanionRuleSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  isGood: z.boolean(),
});

export type CreateCompanionRuleDto = z.infer<typeof createCompanionRuleSchema>;
