import { Migration } from '@mikro-orm/migrations';

export class Migration20260330120000 extends Migration {
  up(): void {
    this.addSql(
      `alter table "articles" alter column "related_vegetable_ids" type text[] using "related_vegetable_ids"::text[];`,
    );
    this.addSql(
      `alter table "articles" alter column "related_soil_ids" type text[] using "related_soil_ids"::text[];`,
    );
    this.addSql(
      `alter table "articles" alter column "related_fertilizer_ids" type text[] using "related_fertilizer_ids"::text[];`,
    );
    this.addSql(
      `alter table "articles" alter column "related_disease_ids" type text[] using "related_disease_ids"::text[];`,
    );
    this.addSql(
      `alter table "articles" alter column "related_pest_ids" type text[] using "related_pest_ids"::text[];`,
    );
  }

  down(): void {
    this.addSql(
      `alter table "articles" alter column "related_vegetable_ids" type uuid[] using "related_vegetable_ids"::uuid[];`,
    );
    this.addSql(
      `alter table "articles" alter column "related_soil_ids" type uuid[] using "related_soil_ids"::uuid[];`,
    );
    this.addSql(
      `alter table "articles" alter column "related_fertilizer_ids" type uuid[] using "related_fertilizer_ids"::uuid[];`,
    );
    this.addSql(
      `alter table "articles" alter column "related_disease_ids" type uuid[] using "related_disease_ids"::uuid[];`,
    );
    this.addSql(
      `alter table "articles" alter column "related_pest_ids" type uuid[] using "related_pest_ids"::uuid[];`,
    );
  }
}
