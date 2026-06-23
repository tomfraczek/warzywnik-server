import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultFertilizers } from './default-fertilizers.seed';

@Injectable()
export class FertilizersSeedService implements OnModuleInit {
  private readonly logger = new Logger(FertilizersSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultFertilizers(this.em);
    this.em.clear();
    this.logger.log('Default fertilizers upserted');
  }
}
