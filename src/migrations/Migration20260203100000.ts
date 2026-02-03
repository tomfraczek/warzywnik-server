import { Migration } from '@mikro-orm/migrations';

export class Migration20260203100000 extends Migration {
  up(): void {
    this.addSql(`create table "fertilizer_types" (
      "id" uuid not null default gen_random_uuid(),
      "slug" varchar(80) not null,
      "name" varchar(120) not null,
      "description" text not null,
      "category" varchar(32) not null,
      "form" varchar(16) not null,
      "application_method" varchar(32) not null,
      "risk_level" varchar(16) not null,
      "nitrogen_effect" varchar(16) not null,
      "phosphorus_effect" varchar(16) not null,
      "potassium_effect" varchar(16) not null,
      "ph_effect" varchar(16) not null,
      "soil_structure_effect" varchar(16) not null,
      "water_retention_effect" varchar(16) not null,
      "drainage_effect" varchar(16) not null,
      "recommended_frequency" varchar(16) not null,
      "dosage_guidance" text null,
      "notes" text null,
      "is_active" boolean not null default true,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "fertilizer_types_pkey" primary key ("id")
    );`);

    this.addSql(
      `alter table "fertilizer_types" add constraint "fertilizer_types_slug_unique" unique ("slug");`,
    );

    this.addSql(
      `create index "idx_fertilizer_types_category" on "fertilizer_types" ("category");`,
    );
    this.addSql(
      `create index "idx_fertilizer_types_is_active" on "fertilizer_types" ("is_active");`,
    );
  }

  down(): void {
    this.addSql('drop table if exists "fertilizer_types" cascade;');
  }
}
