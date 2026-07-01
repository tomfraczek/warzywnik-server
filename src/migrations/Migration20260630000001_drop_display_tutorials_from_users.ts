import { Migration } from '@mikro-orm/migrations';

export class Migration20260630000001_drop_display_tutorials_from_users extends Migration {
  override up(): void {
    this.addSql(
      `alter table "users" drop column if exists "display_tutorials";`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "users" add column "display_tutorials" boolean not null default true;`,
    );
  }
}
