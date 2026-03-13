import { EntityManager } from '@mikro-orm/postgresql';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { Disease } from './disease.entity';

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
    resolve(process.cwd(), 'temp/diseases_seed_complete.json'),
    '/Users/tomaszfraczek/Downloads/diseases_seed_complete.json',
    resolve(process.cwd(), 'src/diseases/default-diseases.seed.json'),
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
    ? await em.find(ActionTemplate, { id: { $in: actionTemplateIds } })
    : [];

  const actionTemplateById = new Map(
    actionTemplates.map((item) => [item.id, item]),
  );

  for (const seed of DEFAULT_DISEASES) {
    const normalized = normalizeName(seed.name);
    let disease = byNormalizedName.get(normalized);

    if (!disease) {
      disease = new Disease();
      byNormalizedName.set(normalized, disease);
    }

    disease.name = seed.name.trim().replace(/\s+/g, ' ');
    disease.description = seed.description;
    disease.symptoms = seed.symptoms;
    disease.prevention = seed.prevention;
    disease.treatment = seed.treatment;

    const linkedTemplates = seed.recommendedActionTemplateIds
      .map((id) => actionTemplateById.get(id))
      .filter((item): item is ActionTemplate => Boolean(item));

    if (
      linkedTemplates.length !== seed.recommendedActionTemplateIds.length &&
      logger
    ) {
      const missingIds = seed.recommendedActionTemplateIds.filter(
        (id) => !actionTemplateById.has(id),
      );
      logger.warn(
        `Disease seed "${seed.name}" references missing ActionTemplate IDs: ${missingIds.join(', ')}`,
      );
    }

    disease.recommendedActions.set(linkedTemplates);
    em.persist(disease);
  }

  await em.flush();
}
