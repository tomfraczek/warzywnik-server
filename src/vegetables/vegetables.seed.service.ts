import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultVegetables } from './default-vegetables.seed';
import { upsertDefaultSoils } from '../soils/default-soils.seed';
import { upsertDefaultPests } from '../pests/default-pests.seed';
import { upsertDefaultDiseases } from '../diseases/default-diseases.seed';

@Injectable()
export class VegetablesSeedService implements OnModuleInit {
  private readonly logger = new Logger(VegetablesSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultSoils(this.em);
    await upsertDefaultPests(this.em, this.logger);
    await upsertDefaultDiseases(this.em, this.logger);

    const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
    const shouldLogMissingReferences =
      appEnv === 'development' || appEnv === 'local';

    await upsertDefaultVegetables(
      this.em,
      shouldLogMissingReferences
        ? (message) => this.logger.warn(message)
        : undefined,
    );

    this.em.clear();

    if (!shouldLogMissingReferences) {
      this.logger.log(
        'Vegetables missing-reference warnings suppressed for non-local environment',
      );
    }

    this.logger.log('Default vegetables upserted');
  }
}
