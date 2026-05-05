import { Migration } from '@mikro-orm/migrations';

export class Migration20260421000000 extends Migration {
  up(): void {
    this.addSql(
      `ALTER TYPE "reminders_status_enum" ADD VALUE IF NOT EXISTS 'processing';`,
    );
  }

  down(): void {
    // PostgreSQL does not support removing enum values safely in a generic rollback.
  }
}
