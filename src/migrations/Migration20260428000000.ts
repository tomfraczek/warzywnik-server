import { Migration } from '@mikro-orm/migrations';

export class Migration20260428000000 extends Migration {
  up(): void {
    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'action_templates_generation_mode_enum') then
          create type "action_templates_generation_mode_enum" as enum (
            'AUTO',
            'ROUTINE',
            'SUGGESTION',
            'MANUAL_ONLY',
            'POST_HARVEST_PROMPT',
            'WEATHER_TRIGGERED',
            'SEASONAL'
          );
        end if;
      end$$;
    `);

    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'action_templates_priority_enum') then
          create type "action_templates_priority_enum" as enum (
            'low',
            'medium',
            'high',
            'critical'
          );
        end if;
      end$$;
    `);

    this.addSql(
      `alter table "action_templates" add column if not exists "generation_mode" "action_templates_generation_mode_enum" not null default 'AUTO';`,
    );
    this.addSql(
      `alter table "action_templates" add column if not exists "priority" "action_templates_priority_enum" not null default 'medium';`,
    );
    this.addSql(
      `alter table "action_templates" add column if not exists "max_auto_occurrences_per_planting" int null;`,
    );
    this.addSql(
      `alter table "action_templates" add column if not exists "min_days_between_occurrences" int null;`,
    );
    this.addSql(
      `alter table "action_templates" add column if not exists "requires_user_confirmation" boolean not null default false;`,
    );

    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'action_tasks_source_type_enum') then
          create type "action_tasks_source_type_enum" as enum (
            'MANUAL',
            'AUTOMATION',
            'SUGGESTION'
          );
        end if;
      end$$;
    `);

    this.addSql(
      `alter table "action_tasks" add column if not exists "source_type" "action_tasks_source_type_enum" not null default 'MANUAL';`,
    );
    this.addSql(
      `update "action_tasks" set "source_type" = 'AUTOMATION' where "source" <> 'MANUAL';`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "source_key" text null;`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "is_user_modified" boolean not null default false;`,
    );
    this.addSql(
      `alter table "action_tasks" add column if not exists "suppressed_at" timestamptz null;`,
    );
    this.addSql(
      `create index if not exists "action_tasks_source_key_index" on "action_tasks" ("source_key");`,
    );

    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'action_recommendations_severity_enum') then
          create type "action_recommendations_severity_enum" as enum (
            'low',
            'medium',
            'high',
            'critical'
          );
        end if;
      end$$;
    `);

    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'action_recommendations_status_enum') then
          create type "action_recommendations_status_enum" as enum (
            'ACTIVE',
            'ACCEPTED',
            'DISMISSED'
          );
        end if;
      end$$;
    `);

    this.addSql(
      `create table if not exists "action_recommendations" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "planting_id" uuid not null,
        "action_template_id" uuid not null,
        "reason" text not null,
        "severity" "action_recommendations_severity_enum" not null default 'medium',
        "status" "action_recommendations_status_enum" not null default 'ACTIVE',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "action_recommendations_pkey" primary key ("id")
      );`,
    );

    this.addSql(
      `alter table "action_recommendations" add constraint "action_recommendations_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "action_recommendations" add constraint "action_recommendations_planting_id_foreign" foreign key ("planting_id") references "plantings" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "action_recommendations" add constraint "action_recommendations_action_template_id_foreign" foreign key ("action_template_id") references "action_templates" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `create index if not exists "action_recommendations_user_id_planting_id_status_index" on "action_recommendations" ("user_id", "planting_id", "status");`,
    );
    this.addSql(
      `create index if not exists "action_recommendations_action_template_id_index" on "action_recommendations" ("action_template_id");`,
    );
  }

  down(): void {
    this.addSql(
      `drop index if exists "action_recommendations_action_template_id_index";`,
    );
    this.addSql(
      `drop index if exists "action_recommendations_user_id_planting_id_status_index";`,
    );
    this.addSql(`drop table if exists "action_recommendations" cascade;`);

    this.addSql(`drop index if exists "action_tasks_source_key_index";`);
    this.addSql(
      `alter table "action_tasks" drop column if exists "suppressed_at";`,
    );
    this.addSql(
      `alter table "action_tasks" drop column if exists "is_user_modified";`,
    );
    this.addSql(
      `alter table "action_tasks" drop column if exists "source_key";`,
    );
    this.addSql(
      `alter table "action_tasks" drop column if exists "source_type";`,
    );

    this.addSql(
      `alter table "action_templates" drop column if exists "requires_user_confirmation";`,
    );
    this.addSql(
      `alter table "action_templates" drop column if exists "min_days_between_occurrences";`,
    );
    this.addSql(
      `alter table "action_templates" drop column if exists "max_auto_occurrences_per_planting";`,
    );
    this.addSql(
      `alter table "action_templates" drop column if exists "priority";`,
    );
    this.addSql(
      `alter table "action_templates" drop column if exists "generation_mode";`,
    );
  }
}
