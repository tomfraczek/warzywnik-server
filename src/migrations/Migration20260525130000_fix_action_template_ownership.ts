import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Correct action_templates ownership semantics.
 *
 * Context: 5 templates had target=planting + aggregation_scope=bed which is a semantic
 * contradiction — they represent shared bed-level work but were linked to plantings.
 * This backfill corrects those rows to target=bed / aggregation_scope=none.
 *
 * Deprecated templates get is_user_selectable=false to prevent selection in new rules/tasks
 * while preserving historical FK references.
 *
 * Template migration map:
 *   kontrola-szkodnikow        planting+bed → bed+none  (canonical BED pest inspection)
 *   kontrola-wilgotnosci-gleby planting+bed → bed+none  [deprecated] → use kontrola-wilgotnosci-gleby-grzadka
 *   podlewanie-roslin          planting+bed → bed+none  (canonical BED watering, weather-triggered)
 *   sciolkowanie-wokol-roslin  planting+bed → bed+none  [deprecated] → use mulczowanie-grzadki
 *   usuwanie-chwastow-przy-roslinach planting+bed → bed+none  [deprecated] → use usuwanie-chwastow-z-grzadki
 */
export class Migration20260525130000_fix_action_template_ownership extends Migration {
  override up(): void {
    // Fix ownership: change conflicting planting+bed templates to bed+none
    this.addSql(`
      UPDATE action_templates
      SET target = 'bed', aggregation_scope = 'none', updated_at = now()
      WHERE slug IN (
        'kontrola-szkodnikow',
        'kontrola-wilgotnosci-gleby',
        'podlewanie-roslin',
        'sciolkowanie-wokol-roslin',
        'usuwanie-chwastow-przy-roslinach'
      )
      AND target = 'planting'
      AND aggregation_scope = 'bed';
    `);

    // Deprecate templates that have canonical BED replacements:
    //   kontrola-wilgotnosci-gleby  → replaced by kontrola-wilgotnosci-gleby-grzadka
    //   sciolkowanie-wokol-roslin   → replaced by mulczowanie-grzadki
    //   usuwanie-chwastow-przy-roslinach → replaced by usuwanie-chwastow-z-grzadki
    this.addSql(`
      UPDATE action_templates
      SET is_user_selectable = false, updated_at = now()
      WHERE slug IN (
        'kontrola-wilgotnosci-gleby',
        'sciolkowanie-wokol-roslin',
        'usuwanie-chwastow-przy-roslinach'
      );
    `);

    // Backfill ownerScopeType/ownerScopeId on existing tasks generated from these templates
    // (they were created as planting-level tasks; reclassify as bed-level where actionTemplate is now bed)
    this.addSql(`
      UPDATE action_tasks at
      SET
        owner_scope_type = 'bed',
        owner_scope_id   = at.bed_id,
        target_type      = 'bed',
        updated_at       = now()
      FROM action_templates tpl
      WHERE at.action_template_id = tpl.id
        AND tpl.slug IN (
          'kontrola-szkodnikow',
          'kontrola-wilgotnosci-gleby',
          'podlewanie-roslin',
          'sciolkowanie-wokol-roslin',
          'usuwanie-chwastow-przy-roslinach'
        )
        AND at.bed_id IS NOT NULL
        AND (at.owner_scope_type IS NULL OR at.owner_scope_type = 'planting');
    `);

    this.addSql(`
      DO $$
      DECLARE cnt INTEGER;
      BEGIN
        SELECT COUNT(*) INTO cnt
        FROM action_templates
        WHERE target = 'planting' AND aggregation_scope = 'bed';
        IF cnt > 0 THEN
          RAISE WARNING 'action_templates: % rows still have target=planting + aggregation_scope=bed after migration', cnt;
        END IF;
      END $$;
    `);
  }

  override down(): void {
    // Revert is_user_selectable on deprecated templates
    this.addSql(`
      UPDATE action_templates
      SET is_user_selectable = true, updated_at = now()
      WHERE slug IN (
        'kontrola-wilgotnosci-gleby',
        'sciolkowanie-wokol-roslin',
        'usuwanie-chwastow-przy-roslinach'
      );
    `);

    // Revert target/aggregation_scope
    this.addSql(`
      UPDATE action_templates
      SET target = 'planting', aggregation_scope = 'bed', updated_at = now()
      WHERE slug IN (
        'kontrola-szkodnikow',
        'kontrola-wilgotnosci-gleby',
        'podlewanie-roslin',
        'sciolkowanie-wokol-roslin',
        'usuwanie-chwastow-przy-roslinach'
      );
    `);
  }
}
