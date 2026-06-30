import { Migration } from '@mikro-orm/migrations';

export class Migration20260622000000_add_subscription_fields_to_users extends Migration {
  override up(): void {
    this.addSql(`
      alter table "users"
        add column if not exists "subscription_plan" varchar(16) not null default 'free',
        add column if not exists "subscription_expires_at" timestamptz null,
        add column if not exists "trial_started_at" timestamptz null,
        add column if not exists "trial_ends_at" timestamptz null;
    `);

    // Backfill existing users: give them a 7-day trial starting now.
    this.addSql(`
      update "users"
      set
        "trial_started_at" = now(),
        "trial_ends_at" = now() + interval '7 days'
      where "trial_started_at" is null;
    `);
  }

  override down(): void {
    this.addSql(`
      alter table "users"
        drop column if exists "subscription_plan",
        drop column if exists "subscription_expires_at",
        drop column if exists "trial_started_at",
        drop column if exists "trial_ends_at";
    `);
  }
}
