import { AppConfig } from './types';
import { Environment } from '../enums/environments';
import { appConfigSchema } from './app-config-schema';

import * as dotenv from 'dotenv';
dotenv.config();

const defaultPort = 4000;
const defaultDbPort = 5432;

const appEnv = (process.env.APP_ENV ??
  process.env.NODE_ENV ??
  'development') as AppConfig['env'];
const isDevelopmentEnv =
  appEnv === Environment.DEVELOPMENT || appEnv === Environment.LOCAL;

const dbUser = isDevelopmentEnv
  ? process.env.DB_USERNAME_DEV
  : process.env.DB_USERNAME;
const dbPassword = isDevelopmentEnv
  ? process.env.DB_PASSWORD_DEV
  : process.env.DB_PASSWORD;
const dbName = isDevelopmentEnv ? process.env.DB_NAME_DEV : process.env.DB_NAME;
const dbPort = isDevelopmentEnv ? process.env.DB_PORT_DEV : process.env.DB_PORT;
const dbHost = isDevelopmentEnv ? process.env.DB_HOST_DEV : process.env.DB_HOST;

export const getConfig = (): AppConfig =>
  appConfigSchema.parse({
    env: appEnv,
    port: parseInt(process.env.PORT ?? `${defaultPort}`, 10),
    db: {
      user: dbUser,
      password: dbPassword,
      name: dbName,
      port: parseInt(dbPort ?? `${defaultDbPort}`, 10),
      host: dbHost,
      ssl: process.env.DB_SSL === 'true',
    },
    // auth0: {
    //   domain: process.env.AUTH0_DOMAIN,
    //   audience: process.env.AUTH0_AUDIENCE,
    // },
  });
