import 'dotenv/config';

import type { MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TSMigrationGenerator, Migrator } from '@mikro-orm/migrations';
import { UnderscoreNamingStrategy } from '@mikro-orm/core';

import { getConfig } from './app.config';

const { db } = getConfig();

function getCaCertificateFromEnv(): string | undefined {
  const raw = process.env.DB_CA_CERT_B64;

  // brak certyfikatu -> pozwalamy na SSL bez CA (np. DO) lub tryb "require"
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }

  // decode base64
  let pem = '';
  try {
    pem = Buffer.from(raw.trim(), 'base64').toString('utf8').trim();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`DB_CA_CERT_B64 base64 decode failed: ${message}`);
  }

  // walidacja PEM
  if (!pem.includes('BEGIN CERTIFICATE') || !pem.includes('END CERTIFICATE')) {
    throw new Error('DB_CA_CERT_B64 decoded value is not a PEM certificate.');
  }

  return pem + '\n';
}

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';
const useSsl = isProduction || isStaging || Boolean(db.ssl);

const caCertificate = useSsl ? getCaCertificateFromEnv() : undefined;
const rejectUnauthorized =
  process.env.DB_SSL_REJECT_UNAUTHORIZED !== undefined
    ? process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
    : Boolean(caCertificate);

const mikroOrmOptions: MikroOrmModuleSyncOptions = {
  metadataProvider: TsMorphMetadataProvider,
  allowGlobalContext: true,
  driver: PostgreSqlDriver,

  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  dbName: db.name,

  discovery: { warnWhenNoEntities: false },

  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],

  namingStrategy: UnderscoreNamingStrategy,

  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    generator: TSMigrationGenerator,
    disableForeignKeys: false,
  },

  extensions: [Migrator],

  driverOptions: useSsl
    ? {
        connection: {
          ssl: {
            ca: caCertificate,
            rejectUnauthorized,
          },
        },
      }
    : undefined,

  debug: false,
};

export default mikroOrmOptions;
