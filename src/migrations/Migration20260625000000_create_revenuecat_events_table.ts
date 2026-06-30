import { Migration } from '@mikro-orm/migrations';

export class Migration20260625000000_create_revenuecat_events_table extends Migration {
  override up(): void {
    this.addSql(`
      create table if not exists "revenuecat_events" (
        "id" uuid not null default gen_random_uuid(),
        "event_id" varchar(255) not null,
        "app_user_id" varchar(255) null,
        "event_type" varchar(64) not null,
        "processed_at" timestamptz not null default now(),
        "raw_payload" jsonb not null,
        constraint "revenuecat_events_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      create unique index if not exists "revenuecat_events_event_id_unique"
        on "revenuecat_events" ("event_id");
    `);

    this.addSql(`
      create index if not exists "revenuecat_events_app_user_id_index"
        on "revenuecat_events" ("app_user_id");
    `);
  }

  override down(): void {
    this.addSql('drop table if exists "revenuecat_events";');
  }
}
