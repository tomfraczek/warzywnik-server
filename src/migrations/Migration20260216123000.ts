import { Migration } from '@mikro-orm/migrations';

export class Migration20260216123000 extends Migration {
  up(): void {
    this.addSql(
      `alter table "planting_diseases" add column if not exists "severity" varchar(10) null;`,
    );
    this.addSql(
      `alter table "planting_diseases" alter column "severity" type varchar(10) using "severity"::text;`,
    );
    this.addSql(`drop type if exists "planting_diseases_severity_enum";`);
  }

  down(): void {
    this.addSql(
      `create type "planting_diseases_severity_enum" as enum ('low', 'medium', 'high');`,
    );
    this.addSql(
      `alter table "planting_diseases" alter column "severity" type "planting_diseases_severity_enum" using "severity"::text::"planting_diseases_severity_enum";`,
    );
  }
}
