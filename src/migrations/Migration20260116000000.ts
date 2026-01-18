import { Migration } from '@mikro-orm/migrations';

export class Migration20260116000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "vegetable_window" ("id" varchar(255) not null, "vegetable_id" varchar(255) not null, "type" text check ("type" in ('sowing','transplanting','planting_out','harvest')) not null, "start_month" int not null, "end_month" int not null, constraint "vegetable_window_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index "vegetable_window_type_index" on "vegetable_window" ("type");`,
    );

    this.addSql(
      `create table "vegetable_media" ("id" varchar(255) not null, "vegetable_id" varchar(255) not null, "type" text check ("type" in ('image','video','illustration')) not null, "url" varchar(255) not null, "title" varchar(255) null, "sort_order" int null, constraint "vegetable_media_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index "vegetable_media_veg_type_idx" on "vegetable_media" ("vegetable_id", "type");`,
    );

    this.addSql(
      `create table "rotation_family_rule" ("id" varchar(255) not null, "from_family" varchar(255) not null, "to_family" varchar(255) not null, "relation" text check ("relation" in ('good_after','not_after')) not null, constraint "rotation_family_rule_pkey" primary key ("id"));`,
    );

    // Add relation column to companion_rule and migrate values from is_good
    this.addSql(
      `alter table "companion_rule" add column "relation" text check ("relation" in ('good','bad','allelopathic')) not null default 'good';`,
    );
    this.addSql(
      `update "companion_rule" set "relation" = case when "is_good" = true then 'good' else 'bad' end;`,
    );
    this.addSql(`alter table "companion_rule" drop column "is_good";`);
    this.addSql(
      `alter table "companion_rule" add constraint "companion_rule_src_tgt_rel_unique" unique ("source_id","target_id","relation");`,
    );

    // Foreign keys for new tables
    this.addSql(
      `alter table "vegetable_window" add constraint "vegetable_window_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetable" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "vegetable_media" add constraint "vegetable_media_vegetable_id_foreign" foreign key ("vegetable_id") references "vegetable" ("id") on update cascade on delete cascade;`,
    );

    // Ensure slug uniqueness
    this.addSql(
      `alter table "vegetable" add constraint "vegetable_slug_unique" unique ("slug");`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "vegetable" drop constraint if exists "vegetable_slug_unique";`,
    );

    this.addSql(
      `alter table "vegetable_media" drop constraint if exists "vegetable_media_vegetable_id_foreign";`,
    );
    this.addSql(
      `alter table "vegetable_window" drop constraint if exists "vegetable_window_vegetable_id_foreign";`,
    );

    this.addSql(
      `alter table "companion_rule" drop constraint if exists "companion_rule_src_tgt_rel_unique";`,
    );
    this.addSql(
      `alter table "companion_rule" add column "is_good" boolean not null default true;`,
    );
    this.addSql(
      `update "companion_rule" set "is_good" = case when "relation" = 'good' then true else false end;`,
    );
    this.addSql(
      `alter table "companion_rule" drop column if exists "relation";`,
    );

    this.addSql(`drop table if exists "vegetable_media" cascade;`);
    this.addSql(`drop table if exists "vegetable_window" cascade;`);
    this.addSql(`drop table if exists "rotation_family_rule" cascade;`);
  }
}
