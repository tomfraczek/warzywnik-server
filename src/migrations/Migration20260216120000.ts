import { Migration } from '@mikro-orm/migrations';

export class Migration20260216120000 extends Migration {
  up(): void {
    this.addSql(
      `create type "planting_diseases_status_enum" as enum ('suspected', 'confirmed', 'resolved');`,
    );
    this.addSql(
      `create type "planting_diseases_severity_enum" as enum ('low', 'medium', 'high');`,
    );
    this.addSql(
      `create type "reminders_status_enum" as enum ('pending', 'sent', 'done', 'skipped', 'canceled');`,
    );
    this.addSql(
      `create type "reminders_type_enum" as enum ('DISEASE_CHECK', 'DISEASE_TREATMENT');`,
    );
    this.addSql(
      `create type "user_devices_platform_enum" as enum ('ios', 'android');`,
    );

    this.addSql(
      `create table "planting_diseases" (
        "id" uuid not null default gen_random_uuid(),
        "planting_id" uuid not null,
        "disease_id" uuid not null,
        "status" "planting_diseases_status_enum" not null,
        "severity" "planting_diseases_severity_enum" null,
        "observed_at" timestamptz not null default now(),
        "notes" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "planting_diseases_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `create index "planting_diseases_planting_id_index" on "planting_diseases" ("planting_id");`,
    );
    this.addSql(
      `create index "planting_diseases_disease_id_index" on "planting_diseases" ("disease_id");`,
    );
    this.addSql(
      `create index "planting_diseases_status_index" on "planting_diseases" ("status");`,
    );
    this.addSql(
      `create unique index "planting_diseases_active_unique" on "planting_diseases" ("planting_id", "disease_id") where "status" <> 'resolved';`,
    );
    this.addSql(
      `alter table "planting_diseases" add constraint "planting_diseases_planting_id_foreign" foreign key ("planting_id") references "plantings" ("id") on update cascade;`,
    );
    this.addSql(
      `alter table "planting_diseases" add constraint "planting_diseases_disease_id_foreign" foreign key ("disease_id") references "diseases" ("id") on update cascade;`,
    );

    this.addSql(
      `create table "reminders" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "scheduled_at" timestamptz not null,
        "status" "reminders_status_enum" not null,
        "type" "reminders_type_enum" not null,
        "payload" jsonb not null,
        "sent_at" timestamptz null,
        "attempts" int not null default 0,
        "last_error" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "reminders_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `create index "reminders_status_scheduled_at_index" on "reminders" ("status", "scheduled_at");`,
    );
    this.addSql(
      `create index "reminders_user_id_index" on "reminders" ("user_id");`,
    );
    this.addSql(
      `alter table "reminders" add constraint "reminders_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`,
    );

    this.addSql(
      `create table "user_devices" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "platform" "user_devices_platform_enum" not null,
        "expo_push_token" varchar(255) not null,
        "is_enabled" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "user_devices_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `create unique index "user_devices_expo_push_token_unique" on "user_devices" ("expo_push_token");`,
    );
    this.addSql(
      `create index "user_devices_user_id_index" on "user_devices" ("user_id");`,
    );
    this.addSql(
      `alter table "user_devices" add constraint "user_devices_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`,
    );
  }

  down(): void {
    this.addSql(`drop table if exists "user_devices" cascade;`);
    this.addSql(`drop table if exists "reminders" cascade;`);
    this.addSql(`drop table if exists "planting_diseases" cascade;`);

    this.addSql(`drop type if exists "user_devices_platform_enum";`);
    this.addSql(`drop type if exists "reminders_type_enum";`);
    this.addSql(`drop type if exists "reminders_status_enum";`);
    this.addSql(`drop type if exists "planting_diseases_severity_enum";`);
    this.addSql(`drop type if exists "planting_diseases_status_enum";`);
  }
}
