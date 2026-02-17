import { Migration } from '@mikro-orm/migrations';

export class Migration20260217090000 extends Migration {
  up(): void {
    // Kolumna pod anulowanie bez jsonb contains
    this.addSql(
      `alter table "reminders" add column if not exists "planting_disease_id" uuid null;`,
    );

    this.addSql(
      `create index if not exists "reminders_planting_disease_id_index" on "reminders" ("planting_disease_id");`,
    );
  }

  down(): void {
    this.addSql(`drop index if exists "reminders_planting_disease_id_index";`);
    this.addSql(
      `alter table "reminders" drop column if exists "planting_disease_id";`,
    );
  }
}
