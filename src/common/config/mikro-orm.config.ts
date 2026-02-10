import 'dotenv/config';
import { MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TSMigrationGenerator, Migrator } from '@mikro-orm/migrations';
import { UnderscoreNamingStrategy } from '@mikro-orm/core';
import { getConfig } from './app.config';

const { db } = getConfig();

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

  // kluczowe zawężenie:
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],

  // jawnie ta sama strategia co runtime (snake_case):
  namingStrategy: UnderscoreNamingStrategy,

  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    generator: TSMigrationGenerator,
    disableForeignKeys: false,
  },

  extensions: [Migrator],

  driverOptions: db.ssl
    ? { connection: { ssl: { rejectUnauthorized: false } } }
    : undefined,

  debug: true,
};

export default mikroOrmOptions;
