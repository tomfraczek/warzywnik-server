import { Migration } from '@mikro-orm/migrations';

export class Migration20260124100000 extends Migration {
  up(): void {
    this.addSql(
      'alter table "vegetables" add column if not exists "image_url" varchar(255) null;',
    );
  }

  down(): void {
    this.addSql('alter table "vegetables" drop column if exists "image_url";');
  }
}
