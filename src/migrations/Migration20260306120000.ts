import { Migration } from '@mikro-orm/migrations';

export class Migration20260306120000 extends Migration {
  up(): void {
    // 1. Add yield fields to plantings
    this.addSql(`
      alter table "plantings"
        add column if not exists "yield_kg" numeric null,
        add column if not exists "yield_quality_rating" int null,
        add column if not exists "yield_notes" text null;
    `);

    // 2. Create planting_events table (append-only)
    this.addSql(`
      create table "planting_events" (
        "id" uuid not null default gen_random_uuid(),
        "planting_id" uuid not null,
        "user_id" uuid not null,
        "bed_id" uuid not null,
        "vegetable_id" uuid not null,
        "event_type" varchar(50) not null,
        "event_time" timestamptz not null,
        "payload" jsonb not null default '{}',
        "created_at" timestamptz not null default now(),
        constraint "planting_events_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      alter table "planting_events"
        add constraint "planting_events_planting_id_foreign"
        foreign key ("planting_id") references "plantings" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      create index "planting_events_planting_id_index"
        on "planting_events" ("planting_id");
    `);

    this.addSql(`
      create index "planting_events_planting_id_event_time_index"
        on "planting_events" ("planting_id", "event_time");
    `);

    this.addSql(`
      create index "planting_events_user_id_index"
        on "planting_events" ("user_id");
    `);

    // 3. Create planting_season_summaries table
    this.addSql(`
      create table "planting_season_summaries" (
        "id" uuid not null default gen_random_uuid(),
        "planting_id" uuid not null,
        "user_id" uuid not null,
        "bed_id" uuid not null,
        "vegetable_id" uuid not null,
        "season_year" int not null,
        "real_start_date" timestamptz null,
        "real_end_date" timestamptz null,
        "season_duration_days" int null,
        "tasks_completed" int not null default 0,
        "watering_count" int not null default 0,
        "fertilization_count" int not null default 0,
        "protection_count" int not null default 0,
        "pest_events" int not null default 0,
        "disease_events" int not null default 0,
        "yield_kg" numeric null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "planting_season_summaries_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      alter table "planting_season_summaries"
        add constraint "planting_season_summaries_planting_id_foreign"
        foreign key ("planting_id") references "plantings" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      create unique index "planting_season_summaries_planting_id_unique"
        on "planting_season_summaries" ("planting_id");
    `);

    this.addSql(`
      create index "planting_season_summaries_user_id_vegetable_id_index"
        on "planting_season_summaries" ("user_id", "vegetable_id");
    `);

    this.addSql(`
      create index "planting_season_summaries_bed_id_index"
        on "planting_season_summaries" ("bed_id");
    `);

    this.addSql(`
      create index "planting_season_summaries_season_year_index"
        on "planting_season_summaries" ("season_year");
    `);
  }

  down(): void {
    this.addSql(`drop table if exists "planting_season_summaries" cascade;`);
    this.addSql(`drop table if exists "planting_events" cascade;`);
    this.addSql(`
      alter table "plantings"
        drop column if exists "yield_kg",
        drop column if exists "yield_quality_rating",
        drop column if exists "yield_notes";
    `);
  }
}
