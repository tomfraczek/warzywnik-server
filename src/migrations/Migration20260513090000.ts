import { Migration } from '@mikro-orm/migrations';

export class Migration20260513090000 extends Migration {
  override up(): void {
    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'notification_intensity_enum') then
          create type "notification_intensity_enum" as enum ('IMPORTANT_ONLY', 'BALANCED', 'ALL');
        end if;
        if not exists (select 1 from pg_type where typname = 'notification_type_enum') then
          create type "notification_type_enum" as enum (
            'TASKS_GENERATED',
            'DAILY_TASKS_SUMMARY',
            'WEATHER_STATUS_CHANGED',
            'GARDEN_RISK_CHANGED',
            'WEATHER_ALERTS_SUMMARY',
            'ARTICLE_RECOMMENDED',
            'LIFECYCLE_SUGGESTION',
            'WEEKLY_DIGEST'
          );
        end if;
        if not exists (select 1 from pg_type where typname = 'notification_route_target_enum') then
          create type "notification_route_target_enum" as enum (
            'HOME',
            'BEDS_LIST',
            'BED_DETAIL',
            'PLANTING_DETAIL',
            'PLANNER',
            'PLANNER_TASKS',
            'WEATHER',
            'GARDEN_RISK',
            'WEATHER_ALERTS',
            'WEATHER_ALERT_DETAIL',
            'ARTICLE_DETAIL',
            'ARTICLES_LIST',
            'NOTIFICATION_CENTER'
          );
        end if;
        if not exists (select 1 from pg_type where typname = 'notification_priority_enum') then
          create type "notification_priority_enum" as enum ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
        end if;
        if not exists (select 1 from pg_type where typname = 'notification_event_status_enum') then
          create type "notification_event_status_enum" as enum ('PENDING', 'PROCESSED', 'SKIPPED', 'FAILED');
        end if;
        if not exists (select 1 from pg_type where typname = 'notification_batch_status_enum') then
          create type "notification_batch_status_enum" as enum ('PENDING', 'SENT', 'SKIPPED', 'FAILED');
        end if;
        if not exists (select 1 from pg_type where typname = 'notification_delivery_status_enum') then
          create type "notification_delivery_status_enum" as enum ('PENDING', 'SENT', 'FAILED');
        end if;
      end$$;
    `);

    this.addSql(`
      create table if not exists "notification_preferences" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "tasks_enabled" boolean not null default true,
        "daily_summary_enabled" boolean not null default true,
        "weather_status_enabled" boolean not null default true,
        "garden_risk_enabled" boolean not null default true,
        "weather_alerts_enabled" boolean not null default true,
        "recommended_articles_enabled" boolean not null default true,
        "lifecycle_suggestions_enabled" boolean not null default true,
        "weekly_digest_enabled" boolean not null default true,
        "intensity" "notification_intensity_enum" not null default 'BALANCED',
        "notification_hour" int not null default 9,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "notification_preferences_pkey" primary key ("id"),
        constraint "notification_preferences_user_unique" unique ("user_id")
      );
      create index if not exists "notification_preferences_user_idx" on "notification_preferences" ("user_id");
      alter table "notification_preferences" add constraint "notification_preferences_user_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      create table if not exists "notification_event_outbox" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "type" "notification_type_enum" not null,
        "source" varchar(64) not null,
        "source_id" uuid null,
        "payload" jsonb not null,
        "dedupe_key" text not null,
        "priority" "notification_priority_enum" not null default 'NORMAL',
        "status" "notification_event_status_enum" not null default 'PENDING',
        "available_at" timestamptz not null default now(),
        "processed_at" timestamptz null,
        "error_message" text null,
        "created_at" timestamptz not null default now(),
        constraint "notification_event_outbox_pkey" primary key ("id")
      );
      create index if not exists "notification_event_outbox_user_status_idx" on "notification_event_outbox" ("user_id", "status", "available_at");
      create index if not exists "notification_event_outbox_dedupe_idx" on "notification_event_outbox" ("dedupe_key");
      alter table "notification_event_outbox" add constraint "notification_event_outbox_user_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      create table if not exists "notification_batches" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "type" "notification_type_enum" not null,
        "route_target" "notification_route_target_enum" not null,
        "title" varchar(180) not null,
        "body" text not null,
        "payload" jsonb not null,
        "dedupe_key" text not null,
        "priority" "notification_priority_enum" not null default 'NORMAL',
        "status" "notification_batch_status_enum" not null default 'PENDING',
        "send_after" timestamptz not null default now(),
        "sent_at" timestamptz null,
        "skipped_reason" text null,
        "created_at" timestamptz not null default now(),
        constraint "notification_batches_pkey" primary key ("id")
      );
      create index if not exists "notification_batches_user_status_idx" on "notification_batches" ("user_id", "status", "send_after");
      create index if not exists "notification_batches_dedupe_idx" on "notification_batches" ("dedupe_key");
      alter table "notification_batches" add constraint "notification_batches_user_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      create table if not exists "notifications" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "type" "notification_type_enum" not null,
        "route_target" "notification_route_target_enum" not null,
        "title" varchar(180) not null,
        "body" text not null,
        "payload" jsonb not null,
        "priority" "notification_priority_enum" not null default 'NORMAL',
        "read_at" timestamptz null,
        "opened_at" timestamptz null,
        "dismissed_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        constraint "notifications_pkey" primary key ("id")
      );
      create index if not exists "notifications_user_created_idx" on "notifications" ("user_id", "created_at");
      create index if not exists "notifications_user_read_idx" on "notifications" ("user_id", "read_at");
      alter table "notifications" add constraint "notifications_user_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      create table if not exists "notification_deliveries" (
        "id" uuid not null default gen_random_uuid(),
        "notification_id" uuid not null,
        "batch_id" uuid not null,
        "user_device_id" uuid null,
        "status" "notification_delivery_status_enum" not null default 'PENDING',
        "expo_ticket_id" varchar(128) null,
        "expo_receipt_id" varchar(128) null,
        "error_code" varchar(64) null,
        "error_message" text null,
        "attempt_count" int not null default 0,
        "created_at" timestamptz not null default now(),
        "sent_at" timestamptz null,
        "failed_at" timestamptz null,
        constraint "notification_deliveries_pkey" primary key ("id")
      );
      create index if not exists "notification_deliveries_status_created_idx" on "notification_deliveries" ("status", "created_at");
      create index if not exists "notification_deliveries_ticket_idx" on "notification_deliveries" ("expo_ticket_id");
      alter table "notification_deliveries" add constraint "notification_deliveries_notification_fk" foreign key ("notification_id") references "notifications" ("id") on update cascade on delete cascade;
      alter table "notification_deliveries" add constraint "notification_deliveries_batch_fk" foreign key ("batch_id") references "notification_batches" ("id") on update cascade on delete cascade;
      alter table "notification_deliveries" add constraint "notification_deliveries_user_device_fk" foreign key ("user_device_id") references "user_devices" ("id") on update cascade on delete set null;
    `);

    this.addSql(`
      create table if not exists "notification_dedupe" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "type" "notification_type_enum" not null,
        "dedupe_key" text not null,
        "expires_at" timestamptz not null,
        "created_at" timestamptz not null default now(),
        constraint "notification_dedupe_pkey" primary key ("id"),
        constraint "notification_dedupe_unique" unique ("user_id", "type", "dedupe_key")
      );
      create index if not exists "notification_dedupe_expires_idx" on "notification_dedupe" ("expires_at");
      alter table "notification_dedupe" add constraint "notification_dedupe_user_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      create table if not exists "weather_notification_state" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "last_weather_status" varchar(64) null,
        "last_weather_status_severity" "notification_priority_enum" null,
        "last_garden_risk_status" varchar(64) null,
        "last_garden_risk_severity" "notification_priority_enum" null,
        "last_computed_at" timestamptz null,
        "updated_at" timestamptz not null default now(),
        constraint "weather_notification_state_pkey" primary key ("id"),
        constraint "weather_notification_state_user_unique" unique ("user_id")
      );
      create index if not exists "weather_notification_state_computed_idx" on "weather_notification_state" ("last_computed_at");
      alter table "weather_notification_state" add constraint "weather_notification_state_user_fk" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;
    `);

    this.addSql(
      'alter table "user_devices" add column if not exists "last_success_at" timestamptz null;',
    );
    this.addSql(
      'alter table "user_devices" add column if not exists "last_error_at" timestamptz null;',
    );
    this.addSql(
      'alter table "user_devices" add column if not exists "last_error_code" varchar(64) null;',
    );
    this.addSql(
      'alter table "user_devices" add column if not exists "disabled_reason" varchar(120) null;',
    );
    this.addSql(
      'alter table "user_devices" add column if not exists "last_receipt_checked_at" timestamptz null;',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "user_devices" drop column if exists "last_receipt_checked_at";',
    );
    this.addSql(
      'alter table "user_devices" drop column if exists "disabled_reason";',
    );
    this.addSql(
      'alter table "user_devices" drop column if exists "last_error_code";',
    );
    this.addSql(
      'alter table "user_devices" drop column if exists "last_error_at";',
    );
    this.addSql(
      'alter table "user_devices" drop column if exists "last_success_at";',
    );

    this.addSql('drop table if exists "weather_notification_state" cascade;');
    this.addSql('drop table if exists "notification_dedupe" cascade;');
    this.addSql('drop table if exists "notification_deliveries" cascade;');
    this.addSql('drop table if exists "notifications" cascade;');
    this.addSql('drop table if exists "notification_batches" cascade;');
    this.addSql('drop table if exists "notification_event_outbox" cascade;');
    this.addSql('drop table if exists "notification_preferences" cascade;');

    this.addSql('drop type if exists "notification_delivery_status_enum";');
    this.addSql('drop type if exists "notification_batch_status_enum";');
    this.addSql('drop type if exists "notification_event_status_enum";');
    this.addSql('drop type if exists "notification_priority_enum";');
    this.addSql('drop type if exists "notification_route_target_enum";');
    this.addSql('drop type if exists "notification_type_enum";');
    this.addSql('drop type if exists "notification_intensity_enum";');
  }
}
