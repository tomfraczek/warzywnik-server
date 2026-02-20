import { Migration } from '@mikro-orm/migrations';

export class Migration20260220123000 extends Migration {
  up(): void {
    this.addSql(
      `alter table "plantings" add column if not exists "harvested_at" timestamptz null;`,
    );
    this.addSql(
      `create index if not exists "plantings_harvested_at_index" on "plantings" ("harvested_at");`,
    );

    this.addSql(
      `create type "harvest_prompt_states_last_answer_enum" as enum ('yes', 'no');`,
    );

    this.addSql(
      `create table "harvest_prompt_states" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "planting_id" uuid not null,
        "last_prompted_on" varchar(10) null,
        "confirmed_harvest_at" timestamptz null,
        "last_answer" "harvest_prompt_states_last_answer_enum" null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "harvest_prompt_states_pkey" primary key ("id")
      );`,
    );

    this.addSql(
      `create index "harvest_prompt_states_user_id_index" on "harvest_prompt_states" ("user_id");`,
    );
    this.addSql(
      `create index "harvest_prompt_states_planting_id_index" on "harvest_prompt_states" ("planting_id");`,
    );
    this.addSql(
      `create unique index "harvest_prompt_states_user_id_planting_id_unique" on "harvest_prompt_states" ("user_id", "planting_id");`,
    );

    this.addSql(
      `alter table "harvest_prompt_states" add constraint "harvest_prompt_states_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "harvest_prompt_states" add constraint "harvest_prompt_states_planting_id_foreign" foreign key ("planting_id") references "plantings" ("id") on update cascade on delete cascade;`,
    );
  }

  down(): void {
    this.addSql(`drop table if exists "harvest_prompt_states" cascade;`);
    this.addSql(
      `drop type if exists "harvest_prompt_states_last_answer_enum";`,
    );

    this.addSql(`drop index if exists "plantings_harvested_at_index";`);
    this.addSql(
      `alter table "plantings" drop column if exists "harvested_at";`,
    );
  }
}
