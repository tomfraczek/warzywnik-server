import { Migration } from '@mikro-orm/migrations';

export class Migration20260204102000 extends Migration {
  up(): void {
    this.addSql(
      `alter table "vegetables" add column if not exists "required_soil_depth_cm" int null;`,
    );
  }

  down(): void {
    this.addSql(
      `alter table "vegetables" drop column if exists "required_soil_depth_cm";`,
    );
  }
}
