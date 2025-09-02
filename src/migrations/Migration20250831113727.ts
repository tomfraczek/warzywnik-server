import { Migration } from '@mikro-orm/migrations';

export class Migration20250831113727 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "vegetable" drop column "ph_min", drop column "ph_max";`);

    this.addSql(`alter table "vegetable" add column "care_tips" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "vegetable" drop column "care_tips";`);

    this.addSql(`alter table "vegetable" add column "ph_min" int null, add column "ph_max" int null;`);
  }

}
