import { Migration } from '@mikro-orm/migrations';

export class Migration20260714120000_create_contact_messages_table extends Migration {
  override up(): void {
    this.addSql(`
      create table if not exists "contact_messages" (
        "id" uuid not null default gen_random_uuid(),
        "category" varchar(32) not null,
        "title" varchar(200) not null,
        "content" text not null,
        "user_id" uuid null,
        "user_email" varchar(255) null,
        "user_display_name" varchar(255) null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "contact_messages_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      create index if not exists "contact_messages_created_at_index"
        on "contact_messages" ("created_at" desc);
    `);

    this.addSql(`
      create index if not exists "contact_messages_category_index"
        on "contact_messages" ("category");
    `);

    this.addSql(`
      create index if not exists "contact_messages_user_id_index"
        on "contact_messages" ("user_id");
    `);
  }

  override down(): void {
    this.addSql(`drop table if exists "contact_messages";`);
  }
}
