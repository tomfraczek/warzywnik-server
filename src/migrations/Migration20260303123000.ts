import { Migration } from '@mikro-orm/migrations';

export class Migration20260303123000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "soils" drop constraint if exists "soils_soil_type_check";',
    );
    this.addSql('alter table "soils" drop column if exists "soil_type";');
  }

  override down(): void {
    this.addSql('alter table "soils" add column "soil_type" text null;');

    this.addSql(
      `update "soils" set "soil_type" = 'OTHER' where "soil_type" is null;`,
    );

    this.addSql(
      `alter table "soils" add constraint "soils_soil_type_check" check("soil_type" in ('SANDY', 'LOAMY', 'CLAY', 'SILT', 'PEAT', 'CHALK', 'COMPOST_RICH', 'OTHER'));`,
    );

    this.addSql('alter table "soils" alter column "soil_type" set not null;');
  }
}
