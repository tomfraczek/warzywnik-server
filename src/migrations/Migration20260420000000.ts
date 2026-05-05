import { Migration } from '@mikro-orm/migrations';

export class Migration20260420000000 extends Migration {
  up(): void {
    this.addSql(
      `ALTER TABLE "articles" ADD COLUMN "cover_updated_at" timestamptz NULL;`,
    );
  }

  down(): void {
    this.addSql(`ALTER TABLE "articles" DROP COLUMN "cover_updated_at";`);
  }
}
