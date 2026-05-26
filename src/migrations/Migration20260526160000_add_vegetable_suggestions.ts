import { Migration } from '@mikro-orm/migrations';

export class Migration20260526160000_add_vegetable_suggestions extends Migration {
  async up(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS vegetable_suggestions (
        id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        name        VARCHAR(80) NOT NULL,
        note        TEXT        NULL,
        user_id     UUID        NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_vegetable_suggestions_created_at
        ON vegetable_suggestions (created_at DESC)
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_vegetable_suggestions_name
        ON vegetable_suggestions (name)
    `);
  }

  async down(): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS vegetable_suggestions`);
  }
}
