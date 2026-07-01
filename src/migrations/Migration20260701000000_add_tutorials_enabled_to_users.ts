import { Migration } from '@mikro-orm/migrations';

export class Migration20260701000000_add_tutorials_enabled_to_users extends Migration {
  override up(): void {
    this.addSql(
      `alter table "users" add column if not exists "tutorials_enabled" boolean not null default true;`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "users" drop column if exists "tutorials_enabled";`,
    );
  }
}
