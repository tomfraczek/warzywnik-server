import { Migration } from '@mikro-orm/migrations';

export class Migration20260420010000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "favorites" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "target_type" text check ("target_type" in ('ARTICLE', 'VEGETABLE', 'SOIL', 'DISEASE', 'PEST', 'FERTILIZER')) not null,
        "target_slug" varchar(180) not null,
        "created_at" timestamptz not null default now(),
        constraint "favorites_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `create unique index "favorites_user_id_target_type_target_slug_unique" on "favorites" ("user_id", "target_type", "target_slug");`,
    );
    this.addSql(
      `create index "favorites_user_id_index" on "favorites" ("user_id");`,
    );
    this.addSql(
      `create index "favorites_target_type_index" on "favorites" ("target_type");`,
    );
    this.addSql(
      `create index "favorites_target_slug_index" on "favorites" ("target_slug");`,
    );
    this.addSql(
      `alter table "favorites" add constraint "favorites_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `create table "analytics_events" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid null,
        "session_id" varchar(120) null,
        "event_type" text check ("event_type" in ('ARTICLE_VIEW', 'ARTICLE_ENGAGED', 'ARTICLE_SCROLL_50', 'ARTICLE_SCROLL_90', 'VEGETABLE_ADDED_TO_BED')) not null,
        "target_type" text check ("target_type" in ('ARTICLE', 'VEGETABLE', 'SOIL', 'DISEASE', 'PEST', 'FERTILIZER')) not null,
        "target_slug" varchar(180) not null,
        "value_int" int null,
        "value_num" numeric(12,2) null,
        "metadata" jsonb not null default '{}',
        "occurred_at" timestamptz not null default now(),
        "idempotency_key" varchar(120) null,
        "created_at" timestamptz not null default now(),
        constraint "analytics_events_pkey" primary key ("id")
      );`,
    );
    this.addSql(
      `create unique index "analytics_events_idempotency_key_unique" on "analytics_events" ("idempotency_key");`,
    );
    this.addSql(
      `create index "analytics_events_event_type_index" on "analytics_events" ("event_type");`,
    );
    this.addSql(
      `create index "analytics_events_target_type_target_slug_index" on "analytics_events" ("target_type", "target_slug");`,
    );
    this.addSql(
      `create index "analytics_events_occurred_at_index" on "analytics_events" ("occurred_at");`,
    );
    this.addSql(
      `alter table "analytics_events" add constraint "analytics_events_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `create table "article_metrics" (
        "article_slug" varchar(180) not null,
        "views_total" int not null default 0,
        "engaged_seconds_total" int not null default 0,
        "scroll50_count" int not null default 0,
        "scroll90_count" int not null default 0,
        "favorite_count" int not null default 0,
        "updated_at" timestamptz not null default now(),
        constraint "article_metrics_pkey" primary key ("article_slug")
      );`,
    );

    this.addSql(
      `create table "vegetable_popularity" (
        "vegetable_slug" varchar(180) not null,
        "add_count_total" int not null default 0,
        "favorite_count" int not null default 0,
        "last_added_at" timestamptz null,
        "updated_at" timestamptz not null default now(),
        constraint "vegetable_popularity_pkey" primary key ("vegetable_slug")
      );`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "vegetable_popularity" cascade;`);
    this.addSql(`drop table if exists "article_metrics" cascade;`);
    this.addSql(`drop table if exists "analytics_events" cascade;`);
    this.addSql(`drop table if exists "favorites" cascade;`);
  }
}
