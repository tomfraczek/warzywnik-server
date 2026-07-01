import { Migration } from '@mikro-orm/migrations';

export class Migration20260630000000_create_user_tutorials_table extends Migration {
  override up(): void {
    this.addSql(`
      create type "tutorial_key" as enum (
        'home', 'beds', 'bedDetails', 'addPlanting', 'calendar', 'articles', 'profile', 'notifications'
      );
    `);

    this.addSql(`
      create table if not exists "user_tutorials" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "tutorial_key" "tutorial_key" not null,
        "completed" boolean not null default false,
        "version" int not null default 1,
        "completed_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "user_tutorials_pkey" primary key ("id"),
        constraint "user_tutorials_user_key_unique" unique ("user_id", "tutorial_key"),
        constraint "user_tutorials_user_fk" foreign key ("user_id") references "users" ("id") on delete cascade
      );
    `);

    this.addSql(`
      create index if not exists "user_tutorials_user_id_index"
        on "user_tutorials" ("user_id");
    `);
  }

  override down(): void {
    this.addSql('drop table if exists "user_tutorials";');
    this.addSql('drop type if exists "tutorial_key";');
  }
}
