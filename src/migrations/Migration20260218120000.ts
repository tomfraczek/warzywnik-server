import { Migration } from '@mikro-orm/migrations';

export class Migration20260218120000 extends Migration {
  up(): void {
    this.addSql(
      `alter type "reminders_status_enum" add value if not exists 'processing';`,
    );
    this.addSql(
      `alter table "reminders" add column if not exists "locked_at" timestamptz null;`,
    );
  }

  down(): void {
    this.addSql(
      `alter table "reminders" drop column if exists "locked_at";`,
    );
  }
}
