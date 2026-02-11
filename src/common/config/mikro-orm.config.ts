// mikro-orm.config.ts (root projektu)

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

  // Jeśli nie ma zmiennej – zwracamy undefined, a niżej podejmiemy decyzję co dalej.
  if (!b64) return undefined;

  try {
    const pem = Buffer.from(b64, 'base64').toString('utf8').trim();

    if (!pem) {
      throw new Error('Decoded DB_CA_CERT_B64 is empty');
    }

    if (!pem.includes('BEGIN CERTIFICATE')) {
      throw new Error('Decoded DB_CA_CERT_B64 is not a PEM certificate');
    }

    // Zapis do pliku w kontenerze (opcjonalny, ale zostawiam – może się przydać do debugowania).
    // Ważne: nie polegamy na tym pliku w konfiguracji połączenia, tylko zwracamy PEM jako string.
    const certDir = '/app/certs';
    const certPath = path.join(certDir, 'ca-certificate.crt');

    fs.mkdirSync(certDir, { recursive: true });
    fs.writeFileSync(certPath, pem + '\n', { encoding: 'utf8' });

    return pem + '\n';
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid DB_CA_CERT_B64: ${message}`);
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';

// Jeśli NODE_ENV=production/staging, to SSL jest włączone niezależnie od db.ssl
// (to jest zwykle OK na DO/managed Postgres).
const useSsl = isProduction || isStaging || Boolean(db.ssl);

// Cert czytamy tylko, gdy SSL ma być włączone
const caCertificate = useSsl ? getCaCertificateFromEnv() : undefined;

// Fail-fast z czytelnym komunikatem, jeśli SSL jest wymagane, a certu brak.
// (To chroni przed sytuacją: env jest ustawione w DO, ale nie trafia do procesu runtime.)
if (useSsl && !caCertificate) {
  throw new Error(
    'SSL is enabled (NODE_ENV=production/staging or db.ssl=true) but DB_CA_CERT_B64 is missing/empty at runtime.',
  );
}

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
            // NIE ustawiaj "ca: undefined" – ustawiaj tylko gdy masz cert
            ...(caCertificate ? { ca: caCertificate } : {}),
            rejectUnauthorized: true,
          },
        },
      }
    : undefined,

  debug: true,
};

export default mikroOrmOptions;
