import { Migration } from '@mikro-orm/migrations';

export class Migration20260526140000_notification_processing_status extends Migration {
  override isTransactional(): boolean {
    // CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
    return false;
  }

  async up(): Promise<void> {
    // Add PROCESSING status to notification_event_outbox enum
    await this.execute(
      `ALTER TYPE notification_event_status_enum ADD VALUE IF NOT EXISTS 'PROCESSING'`,
    );

    // Add PROCESSING status to notification_batches status enum
    await this.execute(
      `ALTER TYPE notification_batch_status_enum ADD VALUE IF NOT EXISTS 'PROCESSING'`,
    );

    // Deduplicate old-format dedupe_key rows (keep newest batch per user+dedupe_key pair).
    // These duplicates were created before the concurrent-write fix was deployed.
    await this.execute(`
      DELETE FROM notification_batches
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY user_id, dedupe_key ORDER BY created_at DESC) AS rn
          FROM notification_batches
        ) ranked
        WHERE rn > 1
      )
    `);

    // Unique constraint on (user_id, dedupe_key) in notification_batches —
    // prevents concurrent aggregator runs from inserting duplicate batches.
    await this.execute(
      `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_nb_user_dedupe_key_unique
       ON notification_batches (user_id, dedupe_key)`,
    );
  }

  async down(): Promise<void> {
    await this.execute(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_nb_user_dedupe_key_unique`,
    );
    // Note: removing enum values from PostgreSQL requires recreating the type.
    // Leaving PROCESSING in place is safe — it simply becomes an unused value.
  }
}
