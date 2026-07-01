import { z } from 'zod';
import { TutorialKey } from '../tutorial.entity';

export const tutorialKeySchema = z.nativeEnum(TutorialKey);

export const patchTutorialSchema = z
  .object({
    completed: z.boolean(),
    version: z.number().int().min(1),
  })
  .strict();

export type PatchTutorialDto = z.infer<typeof patchTutorialSchema>;

export const patchTutorialsGlobalSchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

export type PatchTutorialsGlobalDto = z.infer<
  typeof patchTutorialsGlobalSchema
>;
