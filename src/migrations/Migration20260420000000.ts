import { Migration } from '@mikro-orm/migrations';

export class Migration20260420000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "articles" ADD COLUMN "cover_updated_at" timestamptz NULL;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "articles" DROP COLUMN "cover_updated_at";`);
  }
}
