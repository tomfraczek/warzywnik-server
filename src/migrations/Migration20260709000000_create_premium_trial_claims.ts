import { Migration } from '@mikro-orm/migrations';

export class Migration20260709000000_create_premium_trial_claims extends Migration {
  override up(): void {
    const pepper = process.env.TRIAL_EMAIL_HASH_PEPPER?.trim();

    if (!pepper) {
      throw new Error('TRIAL_EMAIL_HASH_PEPPER is required');
    }

    this.addSql(`create extension if not exists "pgcrypto";`);

    this.addSql(`
      create table if not exists "premium_trial_claims" (
        "id" uuid not null default gen_random_uuid(),
        "email_hash" varchar(64) not null,
        "trial_started_at" timestamptz not null,
        "trial_ends_at" timestamptz not null,
        "last_user_id" uuid null,
        "last_clerk_user_id" varchar(255) null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "premium_trial_claims_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      create unique index if not exists "premium_trial_claims_email_hash_unique"
        on "premium_trial_claims" ("email_hash");
    `);

    this.addSql(
      this.getKnex().raw(
        `
          with normalized_user_trials as (
            select
              encode(digest(? || ':' || lower(trim("email")), 'sha256'), 'hex') as "email_hash",
              "trial_started_at",
              "trial_ends_at",
              "id" as "last_user_id",
              "clerk_user_id" as "last_clerk_user_id",
              row_number() over (
                partition by lower(trim("email"))
                order by "trial_started_at" asc, "created_at" asc
              ) as "claim_rank"
            from "users"
            where "email" is not null
              and trim("email") <> ''
              and "trial_started_at" is not null
              and "trial_ends_at" is not null
          )
          insert into "premium_trial_claims" (
            "email_hash",
            "trial_started_at",
            "trial_ends_at",
            "last_user_id",
            "last_clerk_user_id",
            "created_at",
            "updated_at"
          )
          select
            "email_hash",
            "trial_started_at",
            "trial_ends_at",
            "last_user_id",
            "last_clerk_user_id",
            now(),
            now()
          from normalized_user_trials
          where "claim_rank" = 1
          on conflict ("email_hash") do update set
            "trial_started_at" = excluded."trial_started_at",
            "trial_ends_at" = excluded."trial_ends_at",
            "last_user_id" = excluded."last_user_id",
            "last_clerk_user_id" = excluded."last_clerk_user_id",
            "updated_at" = now();
        `,
        [pepper],
      ),
    );
  }

  override down(): void {
    this.addSql(`drop table if exists "premium_trial_claims";`);
  }
}
