import { EntityManager } from '@mikro-orm/postgresql';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { Disease } from './disease.entity';
import { toSlug } from '../common/utils/slug.util';

type DiseaseSeedRecord = {
  name: string;
  description: string;
  symptoms: string;
  prevention: string;
  treatment: string;
  recommendedActionTemplateIds: string[];
};

function loadDefaultDiseases(): readonly DiseaseSeedRecord[] {
  const candidatePaths = [
    resolve(process.cwd(), 'src/diseases/default-diseases.seed.json'),
    resolve(process.cwd(), 'temp/diseases_seed_complete.json'),
    '/Users/tomaszfraczek/Downloads/diseases_seed_complete.json',
  ];

  for (const filePath of candidatePaths) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content) as DiseaseSeedRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // try next candidate path
    }
  }

  return [];
}

export const DEFAULT_DISEASES: readonly DiseaseSeedRecord[] =
  loadDefaultDiseases();

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL');
}

export async function upsertDefaultDiseases(
  em: EntityManager,
  logger?: Logger,
): Promise<void> {
  if (DEFAULT_DISEASES.length === 0) {
    logger?.warn(
      'No default disease seeds loaded (missing default-diseases.seed.json).',
    );
    return;
  }

  const existingDiseases = await em.find(Disease, {});
  const byNormalizedName = new Map(
    existingDiseases.map((item) => [normalizeName(item.name), item]),
  );

  const actionTemplateIds = [
    ...new Set(
      DEFAULT_DISEASES.flatMap((seed) => seed.recommendedActionTemplateIds),
    ),
  ];
  const actionTemplates = actionTemplateIds.length
    ? await em.find(ActionTemplate, {
        $or: [
          { id: { $in: actionTemplateIds } },
          { slug: { $in: actionTemplateIds } },
        ],
      })
    : [];

  const actionTemplateByRef = new Map(
    actionTemplates.flatMap((item) => [
      [item.id, item] as const,
      [item.slug, item] as const,
    ]),
  );

  for (const seed of DEFAULT_DISEASES) {
    const normalized = normalizeName(seed.name);
    let disease = byNormalizedName.get(normalized);

    if (!disease) {
      disease = new Disease();
      byNormalizedName.set(normalized, disease);
    }

    disease.name = seed.name.trim().replace(/\s+/g, ' ');
    disease.slug = toSlug(disease.name);
    disease.description = seed.description;
    disease.symptoms = seed.symptoms;
    disease.prevention = seed.prevention;
    disease.treatment = seed.treatment;

    const linkedTemplates = seed.recommendedActionTemplateIds
      .map((ref) => actionTemplateByRef.get(ref))
      .filter((item): item is ActionTemplate => Boolean(item));

    if (
      linkedTemplates.length !== seed.recommendedActionTemplateIds.length &&
      logger
    ) {
      const missingIds = seed.recommendedActionTemplateIds.filter(
        (ref) => !actionTemplateByRef.has(ref),
      );
      logger.warn(
        `Disease seed "${seed.name}" references missing ActionTemplate refs: ${missingIds.join(', ')}`,
      );
    }

    if (seed.recommendedActionTemplateIds.length === 0) {
      disease.recommendedActions.set([]);
    } else if (
      linkedTemplates.length === seed.recommendedActionTemplateIds.length
    ) {
      disease.recommendedActions.set(linkedTemplates);
    }

    em.persist(disease);
  }

  await em.flush();
}
