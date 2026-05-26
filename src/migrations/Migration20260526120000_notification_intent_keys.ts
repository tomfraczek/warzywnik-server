import { Migration } from '@mikro-orm/migrations';

export class Migration20260526120000_notification_intent_keys extends Migration {
  override up(): void {
    this.addSql(`
      alter table "notification_event_outbox"
        add column if not exists "user_intent_key" text null;
    `);

    this.addSql(`
      alter table "notification_batches"
        add column if not exists "user_intent_key" text null;
    `);

    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_type where typname = 'notification_delivery_policy_enum'
        ) then
          create type "notification_delivery_policy_enum" as enum (
            'PUSH_IMMEDIATE',
            'PUSH_DIGEST',
            'CENTER_ONLY',
            'PLAN_ONLY'
          );
        end if;
      end $$;
    `);

    this.addSql(`
      alter table "notification_batches"
        add column if not exists "delivery_policy" notification_delivery_policy_enum
          not null default 'PUSH_DIGEST';
    `);

    this.addSql(`
      create index if not exists "notification_event_outbox_user_intent_key_index"
        on "notification_event_outbox" ("user_intent_key")
        where "user_intent_key" is not null;
    `);

    this.addSql(`
      create index if not exists "notification_batches_user_intent_key_index"
        on "notification_batches" ("user_intent_key")
        where "user_intent_key" is not null;
    `);
  }

  override down(): void {
    this.addSql(
      `drop index if exists "notification_event_outbox_user_intent_key_index"`,
    );
    this.addSql(
      `drop index if exists "notification_batches_user_intent_key_index"`,
    );
    this.addSql(
      `alter table "notification_event_outbox" drop column if exists "user_intent_key"`,
    );
    this.addSql(
      `alter table "notification_batches" drop column if exists "user_intent_key"`,
    );
    this.addSql(
      `alter table "notification_batches" drop column if exists "delivery_policy"`,
    );
    this.addSql(`drop type if exists "notification_delivery_policy_enum"`);
  }
}
