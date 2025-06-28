import { AppConfig } from './types';
import { appConfigSchema } from './app-config-schema';

import * as dotenv from 'dotenv';
dotenv.config();

const defaultPort = 4000;

console.log('🔧 DB CONFIG:', {
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});

export const getConfig = (): AppConfig =>
  appConfigSchema.parse({
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? `${defaultPort}`, 10),
    db: {
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      name: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT ?? `5432`, 10),
      host: process.env.DB_HOST,
    },
    // auth0: {
    //   domain: process.env.AUTH0_DOMAIN,
    //   audience: process.env.AUTH0_AUDIENCE,
    // },
  });
