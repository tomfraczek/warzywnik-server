import { Migration } from '@mikro-orm/migrations';

export class Migration20260203090000 extends Migration {
  up(): void {
    this.addSql(`create table "users" (
      "id" uuid not null default gen_random_uuid(),
      "clerk_user_id" varchar(255) not null,
      "email" varchar(255) null,
      "display_name" varchar(255) null,
      "is_admin" boolean not null default false,
      "subscription" varchar(16) not null default 'STANDARD',
      "locale" varchar(16) not null default 'pl',
      "timezone" varchar(64) not null default 'Europe/Warsaw',
      "notifications_enabled" boolean not null default true,
      "notification_hour" int not null default 9,
      "units" varchar(16) not null default 'METRIC',
      "week_starts_on" int not null default 1,
      "is_active" boolean not null default true,
      "last_login_at" timestamptz null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "users_pkey" primary key ("id")
    );`);

    this.addSql(
      `alter table "users" add constraint "users_clerk_user_id_unique" unique ("clerk_user_id");`,
    );
    this.addSql(
      `alter table "users" add constraint "users_email_unique" unique ("email");`,
    );

    this.addSql(`create index "idx_users_is_admin" on "users" ("is_admin");`);
    this.addSql(
      `create index "idx_users_subscription" on "users" ("subscription");`,
    );
    this.addSql(`create index "idx_users_is_active" on "users" ("is_active");`);
  }

  down(): void {
    this.addSql('drop table if exists "users" cascade;');
  }
}
