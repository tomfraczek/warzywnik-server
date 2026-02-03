import { Migration } from '@mikro-orm/migrations';

export class Migration20260202132339 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "vegetable_recommended_soils" ("vegetable_id" uuid not null, "soil_id" uuid not null, constraint "vegetable_recommended_soils_pkey" primary key ("vegetable_id", "soil_id"));`,
    );

    this.addSql(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vegetable_recommended_soils_vegetable_id_foreign'
      ) THEN
        ALTER TABLE "vegetable_recommended_soils"
          ADD CONSTRAINT "vegetable_recommended_soils_vegetable_id_foreign"
          FOREIGN KEY ("vegetable_id") REFERENCES "vegetables" ("id")
          ON UPDATE CASCADE ON DELETE CASCADE;
      END IF;
    END$$;`);
    this.addSql(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vegetable_recommended_soils_soil_id_foreign'
      ) THEN
        ALTER TABLE "vegetable_recommended_soils"
          ADD CONSTRAINT "vegetable_recommended_soils_soil_id_foreign"
          FOREIGN KEY ("soil_id") REFERENCES "soils" ("id")
          ON UPDATE CASCADE ON DELETE CASCADE;
      END IF;
    END$$;`);

    this.addSql(
      `alter table "soils" drop constraint if exists "soils_soil_type_check";`,
    );

    this.addSql(
      `alter table "vegetables" drop constraint if exists "vegetables_soil_id_foreign";`,
    );

    this.addSql(
      `insert into "vegetable_recommended_soils" ("vegetable_id", "soil_id")
       select "id", "soil_id" from "vegetables" where "soil_id" is not null
       on conflict do nothing;`,
    );

    this.addSql(
      `update "soils" set "soil_type" = 'SANDY' where "soil_type" in ('light', 'LIGHT');`,
    );
    this.addSql(
      `update "soils" set "soil_type" = 'LOAMY' where "soil_type" in ('medium', 'MEDIUM');`,
    );
    this.addSql(
      `update "soils" set "soil_type" = 'CLAY' where "soil_type" in ('heavy', 'HEAVY');`,
    );

    this.addSql(
      `alter table "soils" add constraint "soils_soil_type_check" check("soil_type" in ('SANDY', 'LOAMY', 'CLAY', 'SILT', 'PEAT', 'CHALK', 'COMPOST_RICH', 'OTHER'));`,
    );

    this.addSql(`alter table "vegetables" drop column "soil_id";`);

    this.addSql(
      `alter table "vegetables" add column if not exists "min_soil_depth_cm" int null;`,
    );
    this.addSql(
      `alter table "vegetables" add column if not exists "dominant_nutrient_demand" text check ("dominant_nutrient_demand" in ('N', 'P', 'K', 'BALANCED')) null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "soils" drop constraint if exists "soils_soil_type_check";`,
    );

    this.addSql(`alter table "vegetables" add column "soil_id" uuid null;`);
    this.addSql(
      `alter table "vegetables" add constraint "vegetables_soil_id_foreign" foreign key ("soil_id") references "soils" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `update "vegetables" set "soil_id" = sub."soil_id" from (
        select "vegetable_id", min("soil_id") as "soil_id"
        from "vegetable_recommended_soils"
        group by "vegetable_id"
      ) as sub where "vegetables"."id" = sub."vegetable_id";`,
    );

    this.addSql('drop table if exists "vegetable_recommended_soils" cascade;');

    this.addSql(
      `alter table "vegetables" drop column if exists "min_soil_depth_cm";`,
    );
    this.addSql(
      `alter table "vegetables" drop column if exists "dominant_nutrient_demand";`,
    );

    this.addSql(
      `update "soils" set "soil_type" = 'light' where "soil_type" = 'SANDY';`,
    );
    this.addSql(
      `update "soils" set "soil_type" = 'medium' where "soil_type" in ('LOAMY', 'SILT', 'PEAT', 'CHALK', 'COMPOST_RICH', 'OTHER');`,
    );
    this.addSql(
      `update "soils" set "soil_type" = 'heavy' where "soil_type" = 'CLAY';`,
    );

    this.addSql(
      `alter table "soils" add constraint "soils_soil_type_check" check("soil_type" in ('light', 'medium', 'heavy'));`,
    );
  }
}
