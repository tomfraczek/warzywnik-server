/**
 * Action template seed classification tests.
 *
 * Verifies that the seed data conforms to the ownership semantics introduced
 * alongside ownerScopeType / ownerScopeId on ActionTask:
 *
 *   BED task    = shared work for the whole bed
 *   PLANTING task = work specific to one crop
 *   SPACE task    = environment/infrastructure work for a greenhouse/tunnel/space
 *
 * These tests run against the JSON seed file directly, without a DB.
 */

import defaultTemplates from './default-action-templates.seed-data.json';
import { toSlug } from '../common/utils/slug.util';

type SeedTemplate = {
  name: string;
  target: string;
  aggregationScope: string;
  generationMode: string;
  isUserSelectable?: boolean;
  type?: string;
};

const data: SeedTemplate[] = defaultTemplates as SeedTemplate[];

function bySlug(slug: string): SeedTemplate | undefined {
  return data.find((t) => toSlug(t.name) === slug);
}

// ────────────────────────────────────────────────────────────────────────────
// 1. No active shared-maintenance template has target=planting + aggScope=bed
// ────────────────────────────────────────────────────────────────────────────
describe('action_templates seed — no target=planting + aggregationScope=bed', () => {
  it('has zero templates with conflicting planting+bed semantics', () => {
    const conflicts = data.filter(
      (t) => t.target === 'planting' && t.aggregationScope === 'bed',
    );
    expect(conflicts).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Canonical BED templates exist and have correct classification
// ────────────────────────────────────────────────────────────────────────────
describe('action_templates seed — canonical BED templates', () => {
  const canonicalBedSlugs = [
    'kontrola-szkodnikow', // BED pest inspection (was planting+bed)
    'podlewanie-roslin', // BED watering — weather-triggered (was planting+bed)
    'kontrola-wilgotnosci-gleby-grzadka', // canonical BED moisture check
    'usuwanie-chwastow-z-grzadki', // canonical BED weeding
    'mulczowanie-grzadki', // canonical BED mulching
  ];

  for (const slug of canonicalBedSlugs) {
    it(`${slug} has target=bed and aggregationScope=none`, () => {
      const t = bySlug(slug);
      expect(t).toBeDefined();
      expect(t!.target).toBe('bed');
      expect(t!.aggregationScope).toBe('none');
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Deprecated templates are non-selectable
// ────────────────────────────────────────────────────────────────────────────
describe('action_templates seed — deprecated templates are non-selectable', () => {
  const deprecatedSlugs = [
    'kontrola-wilgotnosci-gleby', // replaced by kontrola-wilgotnosci-gleby-grzadka
    'sciolkowanie-wokol-roslin', // replaced by mulczowanie-grzadki
    'usuwanie-chwastow-przy-roslinach', // replaced by usuwanie-chwastow-z-grzadki
  ];

  for (const slug of deprecatedSlugs) {
    it(`${slug} has isUserSelectable=false`, () => {
      const t = bySlug(slug);
      expect(t).toBeDefined();
      expect(t!.isUserSelectable).toBe(false);
    });

    it(`${slug} has target=bed (no longer planting)`, () => {
      const t = bySlug(slug);
      expect(t!.target).toBe('bed');
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 4. PLANTING templates for harvest/pruning/staking remain correct
// ────────────────────────────────────────────────────────────────────────────
describe('action_templates seed — PLANTING templates for planting-specific work', () => {
  const plantingSpecificSlugs = [
    'zbior-plonow',
    'usuniecie-roslin-po-sezonie',
    'podwiazywanie-roslin',
    'usuwanie-pedow-bocznych',
    'przycinanie-roslin',
    'nawozenie-organiczne',
    'siew-nasion',
    'sadzenie-rozsady',
  ];

  for (const slug of plantingSpecificSlugs) {
    it(`${slug} has target=planting`, () => {
      const t = bySlug(slug);
      expect(t).toBeDefined();
      expect(t!.target).toBe('planting');
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 5. SPACE templates have correct classification
// ────────────────────────────────────────────────────────────────────────────
describe('action_templates seed — SPACE templates for environment/infrastructure work', () => {
  const spaceSlugs = [
    'codzienna-kontrola-klimatu-szklarnia',
    'codzienna-kontrola-klimatu-tunel',
    'wentylacja-szklarni',
    'wentylacja-tunelu',
    'redukcja-wilgotnosci-szklarnia',
    'regulacja-cieniowania-szklarnia',
  ];

  for (const slug of spaceSlugs) {
    it(`${slug} has target=space`, () => {
      const t = bySlug(slug);
      expect(t).toBeDefined();
      expect(t!.target).toBe('space');
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Overall counts: no regression
// ────────────────────────────────────────────────────────────────────────────
describe('action_templates seed — overall counts', () => {
  it('has at least 80 templates', () => {
    expect(data.length).toBeGreaterThanOrEqual(80);
  });

  it('has more BED templates than before the refactor (was 24, now >= 27)', () => {
    const bedCount = data.filter((t) => t.target === 'bed').length;
    // pre-refactor: 24 bed templates; post-refactor: +3 converted from planting+bed
    expect(bedCount).toBeGreaterThanOrEqual(27);
  });

  it('has zero planting templates with aggregationScope=bed', () => {
    const count = data.filter(
      (t) => t.target === 'planting' && t.aggregationScope === 'bed',
    ).length;
    expect(count).toBe(0);
  });
});
