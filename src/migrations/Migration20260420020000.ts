import { Migration } from '@mikro-orm/migrations';

export class Migration20260420020000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "articles" ADD COLUMN "read_time_minutes" int NOT NULL DEFAULT 1;`,
    );

    this.addSql(`
      UPDATE "articles"
      SET "read_time_minutes" = GREATEST(
        1,
        CEIL(
          COALESCE(
            array_length(
              regexp_split_to_array(
                trim(
                  regexp_replace(
                    regexp_replace("content", '<[^>]*>', ' ', 'g'),
                    '\\s+',
                    ' ',
                    'g'
                  )
                ),
                '\\s+'
              ),
              1
            ),
            0
          ) / 200.0
        )::int
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "articles" DROP COLUMN "read_time_minutes";`);
  }
}
