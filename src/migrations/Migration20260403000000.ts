import { Migration } from '@mikro-orm/migrations';

export class Migration20260403000000 extends Migration {
  up(): void {
    // Fill botanical_family from the old family column where it is still NULL.
    // ALLIACEAE is the modern AMARYLLIDACEAE; all other VegetableFamily values
    // are identical strings in BotanicalFamily, except OTHER which maps to NULL.
    this.addSql(`
      UPDATE "vegetables"
      SET "botanical_family" = CASE "family"
        WHEN 'ALLIACEAE' THEN 'AMARYLLIDACEAE'
        WHEN 'OTHER'     THEN NULL
        ELSE "family"
      END::vegetables_botanical_family_enum
      WHERE "botanical_family" IS NULL AND "family" IS NOT NULL;
    `);

    this.addSql(`ALTER TABLE "vegetables" DROP COLUMN IF EXISTS "family";`);
  }

  down(): void {
    this.addSql(
      `ALTER TABLE "vegetables" ADD COLUMN IF NOT EXISTS "family" varchar(255) NOT NULL DEFAULT 'OTHER';`,
    );
  }
}
