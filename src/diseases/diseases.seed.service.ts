import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultDiseases } from './default-diseases.seed';

@Injectable()
export class DiseasesSeedService implements OnModuleInit {
  private readonly logger = new Logger(DiseasesSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultDiseases(this.em, this.logger);
    this.em.clear();
    this.logger.log('Default diseases upserted');
  }
}
