import { Migration } from '@mikro-orm/migrations';

export class Migration20260413000000 extends Migration {
  up(): void {
    // Add new slug columns
    this.addSql(`
      ALTER TABLE "articles"
        ADD COLUMN IF NOT EXISTS "related_vegetable_slugs" text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "related_soil_slugs"      text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "related_fertilizer_slugs" text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "related_disease_slugs"   text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "related_pest_slugs"      text[] NOT NULL DEFAULT '{}';
    `);

    // Fill from existing UUID arrays by joining to the respective tables
    this.addSql(`
      UPDATE "articles" a
      SET "related_vegetable_slugs" = COALESCE((
        SELECT array_agg(v.slug)
        FROM unnest(a.related_vegetable_ids) AS uid
        JOIN vegetables v ON v.id = uid::uuid
      ), '{}');
    `);

    this.addSql(`
      UPDATE "articles" a
      SET "related_soil_slugs" = COALESCE((
        SELECT array_agg(s.slug)
        FROM unnest(a.related_soil_ids) AS uid
        JOIN soils s ON s.id = uid::uuid
      ), '{}');
    `);

    this.addSql(`
      UPDATE "articles" a
      SET "related_fertilizer_slugs" = COALESCE((
        SELECT array_agg(f.slug)
        FROM unnest(a.related_fertilizer_ids) AS uid
        JOIN fertilizer_types f ON f.id = uid::uuid
      ), '{}');
    `);

    this.addSql(`
      UPDATE "articles" a
      SET "related_disease_slugs" = COALESCE((
        SELECT array_agg(d.slug)
        FROM unnest(a.related_disease_ids) AS uid
        JOIN diseases d ON d.id = uid::uuid
      ), '{}');
    `);

    this.addSql(`
      UPDATE "articles" a
      SET "related_pest_slugs" = COALESCE((
        SELECT array_agg(p.slug)
        FROM unnest(a.related_pest_ids) AS uid
        JOIN pests p ON p.id = uid::uuid
      ), '{}');
    `);

    // Drop old UUID columns
    this.addSql(`
      ALTER TABLE "articles"
        DROP COLUMN IF EXISTS "related_vegetable_ids",
        DROP COLUMN IF EXISTS "related_soil_ids",
        DROP COLUMN IF EXISTS "related_fertilizer_ids",
        DROP COLUMN IF EXISTS "related_disease_ids",
        DROP COLUMN IF EXISTS "related_pest_ids";
    `);
  }

  down(): void {
    this.addSql(`
      ALTER TABLE "articles"
        ADD COLUMN IF NOT EXISTS "related_vegetable_ids"   text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "related_soil_ids"        text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "related_fertilizer_ids"  text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "related_disease_ids"     text[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "related_pest_ids"        text[] NOT NULL DEFAULT '{}';
    `);

    this.addSql(`
      ALTER TABLE "articles"
        DROP COLUMN IF EXISTS "related_vegetable_slugs",
        DROP COLUMN IF EXISTS "related_soil_slugs",
        DROP COLUMN IF EXISTS "related_fertilizer_slugs",
        DROP COLUMN IF EXISTS "related_disease_slugs",
        DROP COLUMN IF EXISTS "related_pest_slugs";
    `);
  }
}
