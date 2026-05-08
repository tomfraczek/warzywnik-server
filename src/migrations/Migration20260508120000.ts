import { Migration } from '@mikro-orm/migrations';

export class Migration20260508120000 extends Migration {
  up(): void {
    this.addSql(`alter table "beds" drop column if exists "length_cm";`);
    this.addSql(`alter table "beds" drop column if exists "width_cm";`);
  }

  down(): void {
    this.addSql(
      `alter table "beds" add column if not exists "length_cm" int null;`,
    );
    this.addSql(
      `alter table "beds" add column if not exists "width_cm" int null;`,
    );
  }
}
