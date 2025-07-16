import { Migration } from '@mikro-orm/migrations';

export class Migration20250711151248 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "soil" ("id" varchar(255) not null, "slug" varchar(255) not null, "name" varchar(255) not null, "description" text null, "advantages" jsonb null, "disadvantages" jsonb null, constraint "soil_pkey" primary key ("id"));`);
    this.addSql(`alter table "soil" add constraint "soil_slug_unique" unique ("slug");`);

    this.addSql(`create table "soil_translation" ("id" varchar(255) not null, "soil_id" varchar(255) not null, "lang" varchar(255) not null, "name" varchar(255) not null, "description" text null, "advantages" text null, "disadvantages" text null, constraint "soil_translation_pkey" primary key ("id"));`);

    this.addSql(`create table "user" ("id" serial primary key, "clerk_user_id" varchar(255) not null, "name" varchar(255) null, "is_admin" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "user" add constraint "user_clerk_user_id_unique" unique ("clerk_user_id");`);

    this.addSql(`create table "vegetable" ("id" varchar(255) not null, "slug" varchar(255) not null, "name" varchar(255) not null, "latin_name" varchar(255) null, "description" text null, "image" varchar(255) not null, "sowing_time_start" varchar(255) not null, "sowing_time_end" varchar(255) not null, "harvest_time_start" varchar(255) not null, "harvest_time_end" varchar(255) not null, "germination_days" int not null, "sowing_depth_cm" int not null, "row_spacing_cm" int not null, "plant_spacing_cm" int not null, "is_direct_sow" boolean not null, "is_perennial" boolean not null, "sun_exposure" text check ("sun_exposure" in ('full_sun', 'partial_shade', 'shade')) not null, "watering_needs" text check ("watering_needs" in ('low', 'medium', 'high')) not null, "soil_type_id" varchar(255) null, constraint "vegetable_pkey" primary key ("id"));`);

    this.addSql(`create table "companion_rule" ("id" varchar(255) not null, "source_id" varchar(255) not null, "target_id" varchar(255) not null, "is_good" boolean not null, constraint "companion_rule_pkey" primary key ("id"));`);

    this.addSql(`create table "vegetable_translation" ("id" varchar(255) not null, "vegetable_id" varchar(255) not null, "lang" varchar(255) not null, "name" varchar(255) not null, "description" text not null, "advantages" text null, "disadvantages" text null, constraint "vegetable_translation_pkey" primary key ("id"));`);

    this.addSql(`alter table "soil_translation" add constraint "soil_translation_soil_id_foreign" foreign key ("soil_id") references "soil" ("id") on update cascade;`);

    this.addSql(`alter table "vegetable" add constraint "vegetable_soil_type_id_foreign" foreign key ("soil_type_id") references "soil" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "companion_rule" add constraint "companion_rule_source_id_foreign" foreign key ("source_id") references "vegetable" ("id") on update cascade;`);
    this.addSql(`alter table "companion_rule" add constraint "companion_rule_target_id_foreign" foreign key ("target_id") references "vegetable" ("id") on update cascade;`);

    this.addSql(`alter table "vegetable_translation" add constraint "vegetable_translation_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetable" ("id") on update cascade;`);
  }

}
