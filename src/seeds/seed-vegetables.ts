import 'dotenv/config';
import { MikroORM } from '@mikro-orm/postgresql';
import type { EntityManager } from '@mikro-orm/postgresql';
import mikroOrmOptions from '../common/config/mikro-orm.config';
import { upsertDefaultVegetables } from '../vegetables/default-vegetables.seed';

async function run(): Promise<void> {
  const orm = await MikroORM.init(mikroOrmOptions);

  try {
    const em = orm.em.fork() as EntityManager;
    await upsertDefaultVegetables(em, (message) => console.warn(message));
    console.log('Vegetables seed upsert finished');
  } finally {
    await orm.close(true);
  }
}

void run();
