import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import type { MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TSMigrationGenerator, Migrator } from '@mikro-orm/migrations';
import { UnderscoreNamingStrategy } from '@mikro-orm/core';

import { getConfig } from './app.config';

const { db } = getConfig();

function getCaCertificateFromEnv(): string | undefined {
  const b64 = process.env.DB_CA_CERT_B64;
  if (!b64) return undefined;

  try {
    const pem = Buffer.from(b64, 'base64').toString('utf8').trim();
    if (!pem.includes('BEGIN CERTIFICATE')) {
      throw new Error('Decoded DB_CA_CERT_B64 is not a PEM certificate');
    }

    // opcjonalnie: zapis do pliku w kontenerze (dla debug/zgodności z Twoją koncepcją)
    const certDir = '/app/certs';
    const certPath = path.join(certDir, 'ca-certificate.crt');
    fs.mkdirSync(certDir, { recursive: true });
    fs.writeFileSync(certPath, pem, { encoding: 'utf8' });

    return pem;
  } catch (e) {
    // nie rzucamy "cicho" – lepiej fail fast niż connect error bez kontekstu
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid DB_CA_CERT_B64: ${message}`);
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';
const useSsl = isProduction || isStaging || Boolean(db.ssl);

const caCertificate = useSsl ? getCaCertificateFromEnv() : undefined;

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
            // jeśli nie ustawisz DB_CA_CERT_B64, a useSsl=true, to fail fast:
            ca: caCertificate,
            rejectUnauthorized: true,
          },
        },
      }
    : undefined,

  debug: true,
};

export default mikroOrmOptions;
