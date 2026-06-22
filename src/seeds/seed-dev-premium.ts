/**
 * Dev-only seed: grants Premium to a user by clerkUserId.
 * Usage: npm run seed:dev-premium -- <clerkUserId> [daysFromNow]
 * Example: npm run seed:dev-premium -- user_abc123 30
 */
import 'dotenv/config';
import { MikroORM } from '@mikro-orm/postgresql';
import type { EntityManager } from '@mikro-orm/postgresql';
import mikroOrmOptions from '../common/config/mikro-orm.config';
import { User } from '../users/user.entity';
import { SubscriptionPlan } from '../common/enums/user.enums';

async function run(): Promise<void> {
  const clerkUserId = process.argv[2];
  const daysFromNow = parseInt(process.argv[3] ?? '30', 10);

  if (!clerkUserId) {
    console.error('Usage: npm run seed:dev-premium -- <clerkUserId> [daysFromNow]');
    process.exit(1);
  }

  const orm = await MikroORM.init(mikroOrmOptions);

  try {
    const em = orm.em.fork() as EntityManager;
    const user = await em.findOne(User, { clerkUserId });

    if (!user) {
      console.error(`User not found: ${clerkUserId}`);
      process.exit(1);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysFromNow);

    user.subscriptionPlan = SubscriptionPlan.PREMIUM;
    user.subscriptionExpiresAt = expiresAt;

    await em.flush();

    console.log(`Premium granted to ${user.email ?? clerkUserId}`);
    console.log(`  subscriptionPlan: ${user.subscriptionPlan}`);
    console.log(`  subscriptionExpiresAt: ${user.subscriptionExpiresAt.toISOString()}`);
  } finally {
    await orm.close(true);
  }
}

void run();
