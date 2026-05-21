import { z } from 'zod';

export type PushTestDto = {
  userId: string;
  title: string;
  body: string;
};

export const pushTestSchema = z
  .object({
    userId: z.string().uuid(),
    title: z.string().trim().min(1).max(180),
    body: z.string().trim().min(1).max(1000),
  })
  .strict();
