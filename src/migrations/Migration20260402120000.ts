import { Migration } from '@mikro-orm/migrations';

export class Migration20260402120000 extends Migration {
  up(): void {
    this.addSql(
      `alter table "vegetables" add column if not exists "is_customized" boolean not null default false;`,
    );
  }

  down(): void {
    this.addSql(`alter table "vegetables" drop column "is_customized";`);
  }
}
