import { Migration } from '@mikro-orm/migrations';

export class Migration20260218120000 extends Migration {
  override up(): void {
    this.addSql(`
      alter table "reminders"
      add column "locked_at" timestamptz null;
    `);

    // indeks opcjonalny — przyspiesza claim
    this.addSql(`
      create index if not exists "reminders_status_scheduled_locked_idx"
      on "reminders" ("status", "scheduled_at", "locked_at");
    `);
  }

  override down(): void {
    this.addSql(`
      drop index if exists "reminders_status_scheduled_locked_idx";
    `);

    this.addSql(`
      alter table "reminders"
      drop column if exists "locked_at";
    `);
  }
}
