import { z } from 'zod';
import { Environment } from '../enums/environments';

export const appConfigSchema = z.object({
  env: z.nativeEnum(Environment),
  port: z.number().int().positive(),
  db: z.object({
    user: z.string().trim().min(1),
    password: z.string().trim().min(1),
    name: z.string().trim().min(1),
    port: z.number().int().positive(),
    host: z.string().trim().min(1),
  }),
  // clerk: z.object({
  //   domain: z.string().min(1),
  //   audience: z.string().min(1),
  // }),
});
