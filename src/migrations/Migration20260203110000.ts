import { Migration } from '@mikro-orm/migrations';

export class Migration20260203110000 extends Migration {
  up(): void {
    this.addSql(`create table "warning_rules" (
      "id" uuid not null default gen_random_uuid(),
      "code" text not null,
      "enabled" boolean not null default true,
      "severity" text not null default 'WARNING',
      "title" varchar(120) not null,
      "message_template" text not null,
      "hint_template" text null,
      "blocking" boolean not null default false,
      "cooldown_days" int null,
      "is_active" boolean not null default true,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "warning_rules_pkey" primary key ("id")
    );`);

    this.addSql(
      `alter table "warning_rules" add constraint "warning_rules_code_unique" unique ("code");`,
    );

    this.addSql(
      `create index "idx_warning_rules_enabled" on "warning_rules" ("enabled");`,
    );
    this.addSql(
      `create index "idx_warning_rules_severity" on "warning_rules" ("severity");`,
    );
  }

  down(): void {
    this.addSql('drop table if exists "warning_rules" cascade;');
  }
}
