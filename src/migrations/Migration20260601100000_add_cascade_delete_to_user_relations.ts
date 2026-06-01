import { Migration } from '@mikro-orm/migrations';

/**
 * Adds ON DELETE CASCADE to all FK constraints that reference the `users` table
 * or reference entities that are themselves cascade-deleted from `users`.
 *
 * Prior to this migration, `DELETE /users/me` required manual pre-deletion of
 * Planting and Bed rows to avoid FK violations. After this migration, deleting
 * a User row will automatically cascade to all owned data.
 *
 * Tables with direct `users.id` FK → CASCADE:
 *   harvest_prompt_states, plantings, action_tasks, action_recommendations,
 *   plan_checklist_items, beds, growing_spaces, reminders, user_devices
 *
 * Tables with `plantings.id` FK → CASCADE (no user_id FK, need own cascade):
 *   planting_diseases, harvest_results, planting_season_summaries,
 *   planting_events, pest_occurrences
 *
 * Tables with `action_tasks.{planting,bed}_id` nullable → SET NULL
 * (safe because action_tasks itself is cascade-deleted from users first):
 *   action_tasks.planting_id, action_tasks.bed_id
 *
 * Tables already having correct deleteRule (no change needed):
 *   favorites, weather_snapshots, warning_instances, weather_notification_states,
 *   notification_preferences, notifications, notification_event_outbox,
 *   notification_dedupe, notification_batches
 */
export class Migration20260601100000_add_cascade_delete_to_user_relations extends Migration {
  async up(): Promise<void> {
    // ── Direct User FK → CASCADE ──────────────────────────────────────────

    await this.execute(`
      ALTER TABLE harvest_prompt_states
        DROP CONSTRAINT IF EXISTS harvest_prompt_states_user_id_foreign,
        ADD CONSTRAINT harvest_prompt_states_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE plantings
        DROP CONSTRAINT IF EXISTS plantings_user_id_foreign,
        ADD CONSTRAINT plantings_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE action_tasks
        DROP CONSTRAINT IF EXISTS action_tasks_user_id_foreign,
        ADD CONSTRAINT action_tasks_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE action_recommendations
        DROP CONSTRAINT IF EXISTS action_recommendations_user_id_foreign,
        ADD CONSTRAINT action_recommendations_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE plan_checklist_items
        DROP CONSTRAINT IF EXISTS plan_checklist_items_user_id_foreign,
        ADD CONSTRAINT plan_checklist_items_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE beds
        DROP CONSTRAINT IF EXISTS beds_user_id_foreign,
        ADD CONSTRAINT beds_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE growing_spaces
        DROP CONSTRAINT IF EXISTS growing_spaces_user_id_foreign,
        ADD CONSTRAINT growing_spaces_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE reminders
        DROP CONSTRAINT IF EXISTS reminders_user_id_foreign,
        ADD CONSTRAINT reminders_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE user_devices
        DROP CONSTRAINT IF EXISTS user_devices_user_id_foreign,
        ADD CONSTRAINT user_devices_user_id_foreign
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    // ── Planting children (no user_id FK) → CASCADE from planting ─────────

    await this.execute(`
      ALTER TABLE planting_diseases
        DROP CONSTRAINT IF EXISTS planting_diseases_planting_id_foreign,
        ADD CONSTRAINT planting_diseases_planting_id_foreign
          FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE harvest_results
        DROP CONSTRAINT IF EXISTS harvest_results_planting_id_foreign,
        ADD CONSTRAINT harvest_results_planting_id_foreign
          FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE planting_season_summaries
        DROP CONSTRAINT IF EXISTS planting_season_summaries_planting_id_foreign,
        ADD CONSTRAINT planting_season_summaries_planting_id_foreign
          FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE planting_events
        DROP CONSTRAINT IF EXISTS planting_events_planting_id_foreign,
        ADD CONSTRAINT planting_events_planting_id_foreign
          FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE pest_occurrences
        DROP CONSTRAINT IF EXISTS pest_occurrences_planting_id_foreign,
        ADD CONSTRAINT pest_occurrences_planting_id_foreign
          FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    `);

    // ── HarvestPromptState — also add cascade from planting and bed ────────
    // (for independent planting/bed deletion; user_id cascade already added above)

    await this.execute(`
      ALTER TABLE harvest_prompt_states
        DROP CONSTRAINT IF EXISTS harvest_prompt_states_planting_id_foreign,
        ADD CONSTRAINT harvest_prompt_states_planting_id_foreign
          FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    `);

    await this.execute(`
      ALTER TABLE harvest_prompt_states
        DROP CONSTRAINT IF EXISTS harvest_prompt_states_bed_id_foreign,
        ADD CONSTRAINT harvest_prompt_states_bed_id_foreign
          FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE CASCADE
    `);

    // ── ActionRecommendation — also add cascade from planting ─────────────

    await this.execute(`
      ALTER TABLE action_recommendations
        DROP CONSTRAINT IF EXISTS action_recommendations_planting_id_foreign,
        ADD CONSTRAINT action_recommendations_planting_id_foreign
          FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    `);

    // ── PlanChecklistItem — also add cascade from bed ──────────────────────

    await this.execute(`
      ALTER TABLE plan_checklist_items
        DROP CONSTRAINT IF EXISTS plan_checklist_items_bed_id_foreign,
        ADD CONSTRAINT plan_checklist_items_bed_id_foreign
          FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE CASCADE
    `);

    // ── ActionTask nullable FKs → SET NULL ────────────────────────────────
    // These are nullable; we set null rather than cascade so that independent
    // planting/bed deletion doesn't orphan tasks that belong to a user.

    await this.execute(`
      ALTER TABLE action_tasks
        DROP CONSTRAINT IF EXISTS action_tasks_planting_id_foreign,
        ADD CONSTRAINT action_tasks_planting_id_foreign
          FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE SET NULL
    `);

    await this.execute(`
      ALTER TABLE action_tasks
        DROP CONSTRAINT IF EXISTS action_tasks_bed_id_foreign,
        ADD CONSTRAINT action_tasks_bed_id_foreign
          FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL
    `);
  }

  async down(): Promise<void> {
    // Restore original constraints (NO ACTION — default behaviour before this migration)

    const noActionConstraints: Array<{
      table: string;
      column: string;
      references: string;
    }> = [
      {
        table: 'harvest_prompt_states',
        column: 'user_id',
        references: 'users(id)',
      },
      {
        table: 'harvest_prompt_states',
        column: 'planting_id',
        references: 'plantings(id)',
      },
      {
        table: 'harvest_prompt_states',
        column: 'bed_id',
        references: 'beds(id)',
      },
      { table: 'plantings', column: 'user_id', references: 'users(id)' },
      { table: 'action_tasks', column: 'user_id', references: 'users(id)' },
      {
        table: 'action_tasks',
        column: 'planting_id',
        references: 'plantings(id)',
      },
      { table: 'action_tasks', column: 'bed_id', references: 'beds(id)' },
      {
        table: 'action_recommendations',
        column: 'user_id',
        references: 'users(id)',
      },
      {
        table: 'action_recommendations',
        column: 'planting_id',
        references: 'plantings(id)',
      },
      {
        table: 'plan_checklist_items',
        column: 'user_id',
        references: 'users(id)',
      },
      {
        table: 'plan_checklist_items',
        column: 'bed_id',
        references: 'beds(id)',
      },
      { table: 'beds', column: 'user_id', references: 'users(id)' },
      { table: 'growing_spaces', column: 'user_id', references: 'users(id)' },
      { table: 'reminders', column: 'user_id', references: 'users(id)' },
      { table: 'user_devices', column: 'user_id', references: 'users(id)' },
      {
        table: 'planting_diseases',
        column: 'planting_id',
        references: 'plantings(id)',
      },
      {
        table: 'harvest_results',
        column: 'planting_id',
        references: 'plantings(id)',
      },
      {
        table: 'planting_season_summaries',
        column: 'planting_id',
        references: 'plantings(id)',
      },
      {
        table: 'planting_events',
        column: 'planting_id',
        references: 'plantings(id)',
      },
      {
        table: 'pest_occurrences',
        column: 'planting_id',
        references: 'plantings(id)',
      },
    ];

    for (const { table, column, references } of noActionConstraints) {
      const constraintName = `${table}_${column}_foreign`;
      await this.execute(`
        ALTER TABLE ${table}
          DROP CONSTRAINT IF EXISTS ${constraintName},
          ADD CONSTRAINT ${constraintName}
            FOREIGN KEY (${column}) REFERENCES ${references}
      `);
    }
  }
}
