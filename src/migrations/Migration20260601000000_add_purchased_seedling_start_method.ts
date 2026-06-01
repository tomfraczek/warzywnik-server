import { Migration } from '@mikro-orm/migrations';

export class Migration20260601000000_add_purchased_seedling_start_method extends Migration {
  async up(): Promise<void> {
    // ALTER TYPE ... ADD VALUE is not fully transactional in PostgreSQL.
    // Deploy order: run this migration first, then deploy application code.
    await this.execute(
      `ALTER TYPE "plantings_start_method_enum" ADD VALUE IF NOT EXISTS 'PURCHASED_SEEDLING'`,
    );
  }

  async down(): Promise<void> {
    // PostgreSQL does not support removing enum values via ALTER TYPE.
    // A full type recreation would be needed; leave as no-op for safety.
  }
}
