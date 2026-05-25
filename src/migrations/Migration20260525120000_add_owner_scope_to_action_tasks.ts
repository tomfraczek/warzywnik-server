import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: add owner_scope_type + owner_scope_id to action_tasks.
 *
 * These fields become the canonical ownership source of truth for a task.
 * Existing rows are backfilled from target_type + planting_id / bed_id / growing_space_id.
 *
 * Rows that cannot be backfilled (e.g. target_type=user with no planting/bed)
 * are left NULL so they can be verified manually before we add NOT NULL.
 */
export class Migration20260525120000_add_owner_scope_to_action_tasks extends Migration {
  override up(): void {
    // 1. Add columns (nullable – safe for rolling deployments)
    this.addSql(`
      ALTER TABLE action_tasks
        ADD COLUMN IF NOT EXISTS owner_scope_type varchar(20) NULL,
        ADD COLUMN IF NOT EXISTS owner_scope_id uuid NULL;
    `);

    // 2. Backfill from existing planting / bed / space relations
    this.addSql(`
      UPDATE action_tasks
      SET owner_scope_type = 'planting',
          owner_scope_id   = planting_id
      WHERE target_type = 'planting'
        AND planting_id IS NOT NULL
        AND owner_scope_type IS NULL;
    `);

    this.addSql(`
      UPDATE action_tasks
      SET owner_scope_type = 'bed',
          owner_scope_id   = bed_id
      WHERE target_type = 'bed'
        AND bed_id IS NOT NULL
        AND owner_scope_type IS NULL;
    `);

    this.addSql(`
      UPDATE action_tasks
      SET owner_scope_type = 'space',
          owner_scope_id   = growing_space_id
      WHERE target_type = 'space'
        AND growing_space_id IS NOT NULL
        AND owner_scope_type IS NULL;
    `);

    this.addSql(`
      UPDATE action_tasks
      SET owner_scope_type = 'user'
      WHERE target_type = 'user'
        AND owner_scope_type IS NULL;
    `);

    // 3. Report rows that still couldn't be backfilled (log only – don't fail migration)
    this.addSql(`
      DO $$
      DECLARE v_count integer;
      BEGIN
        SELECT count(*) INTO v_count FROM action_tasks WHERE owner_scope_type IS NULL;
        IF v_count > 0 THEN
          RAISE WARNING 'action_tasks: % rows still have NULL owner_scope_type after backfill – manual review required', v_count;
        END IF;
      END$$;
    `);

    // 4. Index on (owner_scope_type, owner_scope_id) for fast ownership lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS action_tasks_owner_scope_idx
        ON action_tasks (owner_scope_type, owner_scope_id);
    `);

    // 5. New deduplication index: unique pending task per (user, dedupe_key)
    //    Added alongside the old unique constraint – does not remove it.
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS action_tasks_user_dedupe_pending_idx
        ON action_tasks (user_id, dedupe_key)
        WHERE status = 'pending'
          AND dedupe_key IS NOT NULL;
    `);
  }

  override down(): void {
    this.addSql(`DROP INDEX IF EXISTS action_tasks_user_dedupe_pending_idx;`);
    this.addSql(`DROP INDEX IF EXISTS action_tasks_owner_scope_idx;`);
    this.addSql(`
      ALTER TABLE action_tasks
        DROP COLUMN IF EXISTS owner_scope_type,
        DROP COLUMN IF EXISTS owner_scope_id;
    `);
  }
}
