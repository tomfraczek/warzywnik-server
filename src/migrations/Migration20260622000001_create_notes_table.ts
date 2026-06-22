import { Migration } from '@mikro-orm/migrations';

export class Migration20260622000001_create_notes_table extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "notes" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "title" varchar(200) null,
        "content" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "notes_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      create index if not exists "notes_user_id_index" on "notes" ("user_id");
    `);

    this.addSql(`
      alter table "notes"
        add constraint "notes_user_id_foreign"
        foreign key ("user_id")
        references "users" ("id")
        on delete cascade;
    `);
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "notes";');
  }
}
