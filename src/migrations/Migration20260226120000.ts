import { Migration } from '@mikro-orm/migrations';

export class Migration20260226120000 extends Migration {
  up(): void {
    this.addSql(
      `alter type "action_tasks_source_enum" add value if not exists 'WEATHER_WARNING';`,
    );
    this.addSql(
      `alter type "action_tasks_target_type_enum" add value if not exists 'user';`,
    );

    this.addSql(
      `alter table "action_tasks" add column if not exists "dedupe_key" text null;`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "metadata" jsonb null;`,
    );

    this.addSql(
      `create index if not exists "action_tasks_dedupe_key_index" on "action_tasks" ("dedupe_key");`,
    );
    this.addSql(
      `create unique index if not exists "action_tasks_user_dedupe_pending_unique" on "action_tasks" ("user_id", "dedupe_key") where "dedupe_key" is not null and "status" = 'pending';`,
    );

    this.addSql(
      `create table "weather_warning_config" (
        "id" uuid not null default gen_random_uuid(),
        "code" text not null,
        "params" jsonb not null,
        "is_active" boolean not null default true,
        "version" int not null default 1,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "weather_warning_config_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `alter table "weather_warning_config" add constraint "weather_warning_config_code_unique" unique ("code");`,
    );

    this.addSql(
      `create table "warning_instances" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "scope" text not null,
        "bed_id" uuid null,
        "planting_id" uuid null,
        "code" text not null,
        "values" jsonb not null,
        "details" jsonb null,
        "computed_at" timestamptz not null,
        "valid_from" timestamptz not null,
        "valid_to" timestamptz not null,
        "snapshot_fetched_at" timestamptz null,
        "weather_basis" text not null,
        "is_active" boolean not null default true,
        "dedupe_key" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "warning_instances_pkey" primary key ("id")
      );`,
    );

    this.addSql(
      `alter table "warning_instances" add constraint "warning_instances_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "warning_instances" add constraint "warning_instances_bed_id_foreign" foreign key ("bed_id") references "beds" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "warning_instances" add constraint "warning_instances_planting_id_foreign" foreign key ("planting_id") references "plantings" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `create index "warning_instances_user_id_is_active_index" on "warning_instances" ("user_id", "is_active");`,
    );
    this.addSql(
      `create index "warning_instances_user_code_scope_active_index" on "warning_instances" ("user_id", "code", "scope", "is_active");`,
    );
    this.addSql(
      `create unique index "warning_instances_user_dedupe_unique" on "warning_instances" ("user_id", "dedupe_key");`,
    );
    this.addSql(
      `create index "warning_instances_valid_to_index" on "warning_instances" ("valid_to");`,
    );
  }

  down(): void {
    this.addSql(
      `drop index if exists "action_tasks_user_dedupe_pending_unique";`,
    );
    this.addSql(`drop index if exists "action_tasks_dedupe_key_index";`);
    this.addSql(
      `alter table "action_tasks" drop column if exists "dedupe_key";`,
    );
    this.addSql(`alter table "action_tasks" drop column if exists "metadata";`);

    this.addSql(`drop table if exists "warning_instances" cascade;`);
    this.addSql(`drop table if exists "weather_warning_config" cascade;`);
  }
}
