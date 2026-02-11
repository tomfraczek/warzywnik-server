import { Migration } from '@mikro-orm/migrations';

export class Migration20260127085842 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "soil_translation" drop constraint if exists "soil_translation_soil_id_foreign";`,
    );

    this.addSql(
      `alter table if exists "vegetable" drop constraint if exists "vegetable_soil_type_id_foreign";`,
    );

    this.addSql(
      `alter table if exists "user_settings" drop constraint if exists "user_settings_user_id_foreign";`,
    );

    this.addSql(
      `alter table if exists "companion_rule" drop constraint if exists "companion_rule_source_id_foreign";`,
    );

    this.addSql(
      `alter table if exists "companion_rule" drop constraint if exists "companion_rule_target_id_foreign";`,
    );

    this.addSql(
      `alter table if exists "vegetable_media" drop constraint if exists "vegetable_media_vegetable_id_foreign";`,
    );

    this.addSql(
      `alter table if exists "vegetable_translation" drop constraint if exists "vegetable_translation_vegetable_id_foreign";`,
    );

    this.addSql(
      `alter table if exists "vegetable_window" drop constraint if exists "vegetable_window_vegetable_id_foreign";`,
    );

    this.addSql(`drop table if exists "companion_rule" cascade;`);

    this.addSql(`drop table if exists "rotation_family_rule" cascade;`);

    this.addSql(`drop table if exists "soil" cascade;`);

    this.addSql(`drop table if exists "soil_translation" cascade;`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "user_settings" cascade;`);

    this.addSql(`drop table if exists "vegetable" cascade;`);

    this.addSql(`drop table if exists "vegetable_media" cascade;`);

    this.addSql(`drop table if exists "vegetable_translation" cascade;`);

    this.addSql(`drop table if exists "vegetable_window" cascade;`);

    this.addSql(
      `alter table "soils" add constraint "soils_soil_type_check" check("soil_type" in ('light', 'medium', 'heavy'));`,
    );
    this.addSql(
      `alter table "soils" add constraint "soils_structure_check" check("structure" in ('loose', 'crumbly', 'compact'));`,
    );
    this.addSql(
      `alter table "soils" add constraint "soils_water_retention_check" check("water_retention" in ('low', 'medium', 'high'));`,
    );
    this.addSql(
      `alter table "soils" add constraint "soils_drainage_check" check("drainage" in ('poor', 'medium', 'good'));`,
    );
    this.addSql(
      `alter table "soils" add constraint "soils_fertility_level_check" check("fertility_level" in ('low', 'medium', 'high'));`,
    );

    this.addSql(
      `alter table "vegetables" drop column "soil_type", drop column "soil_phmin", drop column "soil_phmax";`,
    );

    this.addSql(`alter table "vegetables" add column "soil_id" uuid null;`);
    this.addSql(
      `alter table "vegetables" add constraint "vegetables_soil_id_foreign" foreign key ("soil_id") references "soils" ("id") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "vegetables" add constraint "vegetables_sun_exposure_check" check("sun_exposure" in ('full_sun', 'partial_shade', 'shade'));`,
    );
    this.addSql(
      `alter table "vegetables" add constraint "vegetables_water_demand_check" check("water_demand" in ('low', 'medium', 'high'));`,
    );
    this.addSql(
      `alter table "vegetables" add constraint "vegetables_nutrient_demand_check" check("nutrient_demand" in ('low', 'medium', 'high'));`,
    );
    this.addSql(
      `alter table "vegetables" add constraint "vegetables_harvest_start_month_check" check("harvest_start_month" in ('january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'));`,
    );
    this.addSql(
      `alter table "vegetables" add constraint "vegetables_harvest_end_month_check" check("harvest_end_month" in ('january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'));`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `create table "companion_rule" ("id" varchar(255) not null, "source_id" varchar(255) not null, "target_id" varchar(255) not null, "relation" text check ("relation" in ('good', 'bad', 'allelopathic')) not null default 'good', constraint "companion_rule_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "companion_rule" add constraint "companion_rule_src_tgt_rel_unique" unique ("source_id", "target_id", "relation");`,
    );

    this.addSql(
      `create table "rotation_family_rule" ("id" varchar(255) not null, "from_family" varchar(255) not null, "to_family" varchar(255) not null, "relation" text check ("relation" in ('good_after', 'not_after')) not null, constraint "rotation_family_rule_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "soil" ("id" varchar(255) not null, "slug" varchar(255) not null, "name" varchar(255) not null, "description" text null, "advantages" jsonb null, "disadvantages" jsonb null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, constraint "soil_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "soil" add constraint "soil_slug_unique" unique ("slug");`,
    );

    this.addSql(
      `create table "soil_translation" ("id" varchar(255) not null, "soil_id" varchar(255) not null, "lang" varchar(255) not null, "name" varchar(255) not null, "description" text null, "advantages" text null, "disadvantages" text null, constraint "soil_translation_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "user" ("id" uuid not null default gen_random_uuid(), "clerk_user_id" varchar(255) not null, "is_admin" bool not null default false, "status" text not null default 'active', "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), constraint "user_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "user" add constraint "user_clerk_user_id_unique" unique ("clerk_user_id");`,
    );

    this.addSql(
      `create table "user_settings" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "unit_length" text not null default 'cm', "unit_area" text not null default 'm2', "locale" text not null default 'pl', "dark_mode" bool not null default false, "updated_at" timestamptz(6) not null default now(), constraint "user_settings_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "user_settings" add constraint "user_settings_user_id_unique" unique ("user_id");`,
    );

    this.addSql(
      `create table "vegetable" ("id" varchar(255) not null, "slug" varchar(255) not null, "name" varchar(255) not null, "latin_name" varchar(255) null, "description" text null, "sun_exposure" text check ("sun_exposure" in ('full_sun', 'partial_shade', 'shade')) null, "soil_type_id" varchar(255) null, "mulching_recommended" bool null, "fertilizing_schedule" text null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "family" varchar(255) null, "plant_type" text check ("plant_type" in ('annual', 'perennial', 'biennial')) null, "growth_form" text check ("growth_form" in ('bush', 'vine', 'tree', 'tuber')) null, "life_cycle" text check ("life_cycle" in ('annual', 'perennial', 'biennial')) null, "days_to_harvest" int4 null, "growing_season_length" int4 null, "min_temp" int4 null, "optimal_temp" int4 null, "frost_resistance" text check ("frost_resistance" in ('none', 'low', 'medium', 'high')) null, "soil_phmin" int4 null, "soil_phmax" int4 null, "water_needs" text check ("water_needs" in ('low', 'medium', 'high')) null, "nutrient_needs" text check ("nutrient_needs" in ('low', 'medium', 'high')) null, "seed_depth" int4 null, "row_spacing" int4 null, "plant_spacing" int4 null, "germination_time_days" int4 null, "germination_temp_min" int4 null, "direct_sow" bool null, "thinning_required" bool null, "watering_frequency_days" int4 null, "staking_required" bool null, "pruning_required" bool null, "common_pests" text[] null, "common_diseases" text[] null, "organic_treatments" text[] null, "chemical_treatments" text[] null, "rotation_group" varchar(255) null, "yield_per_m2" int4 null, "harvest_frequency" text check ("harvest_frequency" in ('')) null, "storage_life" int4 null, "storage_conditions" text[] null, "calories_per100g" int4 null, "macros" jsonb null, "vitamins" text[] null, "minerals" text[] null, "how_to_grow" text null, "common_mistakes" text null, "tips" text null, "faq" text null, "blog_posts" text[] null, "difficulty_level" text check ("difficulty_level" in ('easy', 'medium', 'hard')) null, "space_efficiency" int4 null, "eco_score" int4 null, "bee_friendly" bool null, "active" bool not null default true, "sowing_time_start" varchar(255) null, "sowing_time_end" varchar(255) null, "harvest_time_start" varchar(255) null, "harvest_time_end" varchar(255) null, constraint "vegetable_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "vegetable" add constraint "vegetable_slug_unique" unique ("slug");`,
    );

    this.addSql(
      `create table "vegetable_media" ("id" varchar(255) not null, "vegetable_id" varchar(255) not null, "type" text check ("type" in ('image', 'video', 'illustration')) not null, "url" varchar(255) not null, "title" varchar(255) null, "sort_order" int4 null, constraint "vegetable_media_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index "vegetable_media_veg_type_idx" on "vegetable_media" ("vegetable_id", "type");`,
    );

    this.addSql(
      `create table "vegetable_translation" ("id" varchar(255) not null, "vegetable_id" varchar(255) not null, "lang" varchar(255) not null, "name" varchar(255) not null, "description" text not null, "advantages" text null, "disadvantages" text null, "pre_planting" text null, "in_season_feeding" text null, "warnings" text null, "watering" text null, "mulching" text null, "training_support" text null, "weeding" text null, "pest_prevention" text null, constraint "vegetable_translation_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "vegetable_window" ("id" varchar(255) not null, "vegetable_id" varchar(255) not null, "type" text check ("type" in ('sowing', 'transplanting', 'planting_out', 'harvest')) not null, "start_month" int4 not null, "end_month" int4 not null, constraint "vegetable_window_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index "vegetable_window_type_index" on "vegetable_window" ("type");`,
    );

    this.addSql(
      `alter table "companion_rule" add constraint "companion_rule_source_id_foreign" foreign key ("source_id") references "vegetable" ("id") on update cascade on delete no action;`,
    );
    this.addSql(
      `alter table "companion_rule" add constraint "companion_rule_target_id_foreign" foreign key ("target_id") references "vegetable" ("id") on update cascade on delete no action;`,
    );

    this.addSql(
      `alter table "soil_translation" add constraint "soil_translation_soil_id_foreign" foreign key ("soil_id") references "soil" ("id") on update cascade on delete no action;`,
    );

    this.addSql(
      `alter table "user_settings" add constraint "user_settings_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete no action;`,
    );

    this.addSql(
      `alter table "vegetable" add constraint "vegetable_soil_type_id_foreign" foreign key ("soil_type_id") references "soil" ("id") on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table "vegetable_media" add constraint "vegetable_media_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetable" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "vegetable_translation" add constraint "vegetable_translation_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetable" ("id") on update cascade on delete no action;`,
    );

    this.addSql(
      `alter table "vegetable_window" add constraint "vegetable_window_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetable" ("id") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "soils" drop constraint if exists "soils_soil_type_check";`,
    );
    this.addSql(
      `alter table "soils" drop constraint if exists "soils_structure_check";`,
    );
    this.addSql(
      `alter table "soils" drop constraint if exists "soils_water_retention_check";`,
    );
    this.addSql(
      `alter table "soils" drop constraint if exists "soils_drainage_check";`,
    );
    this.addSql(
      `alter table "soils" drop constraint if exists "soils_fertility_level_check";`,
    );

    this.addSql(
      `alter table "vegetables" drop constraint if exists "vegetables_sun_exposure_check";`,
    );
    this.addSql(
      `alter table "vegetables" drop constraint if exists "vegetables_water_demand_check";`,
    );
    this.addSql(
      `alter table "vegetables" drop constraint if exists "vegetables_nutrient_demand_check";`,
    );
    this.addSql(
      `alter table "vegetables" drop constraint if exists "vegetables_harvest_start_month_check";`,
    );
    this.addSql(
      `alter table "vegetables" drop constraint if exists "vegetables_harvest_end_month_check";`,
    );

    this.addSql(
      `alter table "vegetables" drop constraint "vegetables_soil_id_foreign";`,
    );

    this.addSql(
      `alter table "soils" alter column "soil_type" type text using ("soil_type"::text);`,
    );
    this.addSql(
      `alter table "soils" alter column "structure" type text using ("structure"::text);`,
    );
    this.addSql(
      `alter table "soils" alter column "water_retention" type text using ("water_retention"::text);`,
    );
    this.addSql(
      `alter table "soils" alter column "drainage" type text using ("drainage"::text);`,
    );
    this.addSql(
      `alter table "soils" alter column "fertility_level" type text using ("fertility_level"::text);`,
    );

    this.addSql(`alter table "vegetables" drop column "soil_id";`);

    this.addSql(
      `alter table "vegetables" add column "soil_type" text null, add column "soil_phmin" float8 null, add column "soil_phmax" float8 null;`,
    );
    this.addSql(
      `alter table "vegetables" alter column "sun_exposure" type text using ("sun_exposure"::text);`,
    );
    this.addSql(
      `alter table "vegetables" alter column "water_demand" type text using ("water_demand"::text);`,
    );
    this.addSql(
      `alter table "vegetables" alter column "nutrient_demand" type text using ("nutrient_demand"::text);`,
    );
    this.addSql(
      `alter table "vegetables" alter column "harvest_start_month" type text using ("harvest_start_month"::text);`,
    );
    this.addSql(
      `alter table "vegetables" alter column "harvest_end_month" type text using ("harvest_end_month"::text);`,
    );
  }
}
