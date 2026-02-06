import { Migration } from '@mikro-orm/migrations';

export class Migration20260206120000 extends Migration {
  up(): void {
    this.addSql(`create table "articles" (
      "id" uuid not null default gen_random_uuid(),
      "slug" varchar(120) not null,
      "title" varchar(200) not null,
      "excerpt" text not null,
      "content" text not null,
      "cover_image_url" varchar(255) null,
      "months" int[] not null default '{}'::int[],
      "seasons" text[] not null default '{}'::text[],
      "contexts" text[] not null default '{}'::text[],
      "priority" int not null default 3,
      "related_vegetable_ids" uuid[] not null default '{}'::uuid[],
      "related_soil_ids" uuid[] not null default '{}'::uuid[],
      "related_fertilizer_ids" uuid[] not null default '{}'::uuid[],
      "related_disease_ids" uuid[] not null default '{}'::uuid[],
      "related_pest_ids" uuid[] not null default '{}'::uuid[],
      "status" varchar(16) not null default 'DRAFT',
      "published_at" timestamptz null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "articles_pkey" primary key ("id")
    );`);

    this.addSql(
      'create unique index "articles_slug_unique" on "articles" ("slug");',
    );
    this.addSql(
      'create index "articles_status_index" on "articles" ("status");',
    );
    this.addSql(
      'create index "articles_published_at_index" on "articles" ("published_at");',
    );
  }

  down(): void {
    this.addSql('drop table if exists "articles" cascade;');
  }
}
