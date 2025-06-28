import { MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TSMigrationGenerator, Migrator } from '@mikro-orm/migrations';

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

  discovery: {
    warnWhenNoEntities: false,
  },

  entities: ['dist/**/*.entity{.ts,.js}'],
  entitiesTs: ['src/**/*.entity{.ts,.js}'],

  migrations: {
    path: 'dist/migrations', // compiled JS files
    pathTs: 'src/migrations', // source TS files
    generator: TSMigrationGenerator,
    disableForeignKeys: false,
  },

  extensions: [Migrator],

  driverOptions: {
    connection: {
      ssl: false,
    },
  },

  debug: true,
};

export default mikroOrmOptions;
