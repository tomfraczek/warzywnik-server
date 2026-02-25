import { Migration } from '@mikro-orm/migrations';

export class Migration20260218150000 extends Migration {
  up(): void {
    this.addSql(
      `do $$
      begin
        if not exists (select 1 from pg_type where typname = 'pest_occurrences_status_enum') then
          create type "pest_occurrences_status_enum" as enum ('suspected', 'confirmed', 'resolved');
        end if;
      end$$;`,
    );

    this.addSql(`drop table if exists "pest_occurrences" cascade;`);

    this.addSql(
      `update "reminders"
       set status = 'canceled',
           locked_at = null
       where pest_occurrence_id is not null
         and status::text in ('pending', 'processing');`,
    );

    this.addSql(
      `create table "pest_occurrences" (
        "id" uuid not null default gen_random_uuid(),
        "planting_id" uuid not null,
        "pest_id" uuid not null,
        "status" "pest_occurrences_status_enum" not null,
        "notes" text null,
        "reminder_count" int not null default 0,
        "next_check_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "pest_occurrences_pkey" primary key ("id")
      );`,
    );

    this.addSql(
      `create index "pest_occurrences_planting_id_index" on "pest_occurrences" ("planting_id");`,
    );
    this.addSql(
      `create index "pest_occurrences_pest_id_index" on "pest_occurrences" ("pest_id");`,
    );
    this.addSql(
      `create index "pest_occurrences_status_index" on "pest_occurrences" ("status");`,
    );
    this.addSql(
      `create index "pest_occurrences_next_check_at_index" on "pest_occurrences" ("next_check_at");`,
    );
    this.addSql(
      `create unique index "pest_occurrences_active_unique" on "pest_occurrences" ("planting_id", "pest_id") where "status" <> 'resolved';`,
    );
    this.addSql(
      `alter table "pest_occurrences" add constraint "pest_occurrences_planting_id_foreign" foreign key ("planting_id") references "plantings" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "pest_occurrences" add constraint "pest_occurrences_pest_id_foreign" foreign key ("pest_id") references "pests" ("id") on update cascade;`,
    );
  }

  down(): void {
    this.addSql(`drop table if exists "pest_occurrences" cascade;`);

    this.addSql(
      `create table "pest_occurrences" (
        "id" uuid not null default gen_random_uuid(),
        "bed_id" uuid not null,
        "pest_id" uuid not null,
        "status" "pest_occurrences_status_enum" not null,
        "notes" text null,
        "reminder_count" int not null default 0,
        "next_check_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "pest_occurrences_pkey" primary key ("id")
      );`,
    );

    this.addSql(
      `create index "pest_occurrences_bed_id_index" on "pest_occurrences" ("bed_id");`,
    );
    this.addSql(
      `create index "pest_occurrences_pest_id_index" on "pest_occurrences" ("pest_id");`,
    );
    this.addSql(
      `create index "pest_occurrences_status_index" on "pest_occurrences" ("status");`,
    );
    this.addSql(
      `create index "pest_occurrences_next_check_at_index" on "pest_occurrences" ("next_check_at");`,
    );
    this.addSql(
      `create unique index "pest_occurrences_active_unique" on "pest_occurrences" ("bed_id", "pest_id") where "status" <> 'resolved';`,
    );
    this.addSql(
      `alter table "pest_occurrences" add constraint "pest_occurrences_bed_id_foreign" foreign key ("bed_id") references "beds" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "pest_occurrences" add constraint "pest_occurrences_pest_id_foreign" foreign key ("pest_id") references "pests" ("id") on update cascade;`,
    );
  }
}
