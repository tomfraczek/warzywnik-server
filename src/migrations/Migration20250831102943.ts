import { Migration } from '@mikro-orm/migrations';

export class Migration20250831102943 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "soil" add column "created_at" timestamptz not null, add column "updated_at" timestamptz not null;`);

    this.addSql(`alter table "vegetable" add column "ph_min" int null, add column "ph_max" int null, add column "mulching_recommended" boolean null, add column "feeding_class" text check ("feeding_class" in ('light', 'medium', 'heavy')) null, add column "created_at" timestamptz not null, add column "updated_at" timestamptz not null;`);

    this.addSql(`alter table "vegetable_translation" add column "pre_planting" text null, add column "in_season_feeding" text null, add column "warnings" text null, add column "watering" text null, add column "mulching" text null, add column "training_support" text null, add column "weeding" text null, add column "pest_prevention" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "soil" drop column "created_at", drop column "updated_at";`);

    this.addSql(`alter table "vegetable" drop column "ph_min", drop column "ph_max", drop column "mulching_recommended", drop column "feeding_class", drop column "created_at", drop column "updated_at";`);

    this.addSql(`alter table "vegetable_translation" drop column "pre_planting", drop column "in_season_feeding", drop column "warnings", drop column "watering", drop column "mulching", drop column "training_support", drop column "weeding", drop column "pest_prevention";`);
  }

}
