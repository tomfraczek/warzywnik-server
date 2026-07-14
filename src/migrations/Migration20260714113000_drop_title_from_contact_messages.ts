import { Migration } from '@mikro-orm/migrations';

export class Migration20260714113000_drop_title_from_contact_messages extends Migration {
  override up(): void {
    this.addSql(`alter table "contact_messages" drop column if exists "title";`);
  }

  override down(): void {
    this.addSql(
      `alter table "contact_messages" add column "title" varchar(200) not null default '';`,
    );
  }
}
