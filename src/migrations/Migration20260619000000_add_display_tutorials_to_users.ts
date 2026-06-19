import { Migration } from '@mikro-orm/migrations';

export class Migration20260619000000_add_display_tutorials_to_users extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table "users" add column if not exists "display_tutorials" boolean not null default true;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table "users" drop column if exists "display_tutorials";');
  }
}
