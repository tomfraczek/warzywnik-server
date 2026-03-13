import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultSoils } from './default-soils.seed';

@Injectable()
export class SoilsSeedService implements OnModuleInit {
  private readonly logger = new Logger(SoilsSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultSoils(this.em);
    this.logger.log('Default soils upserted');
  }
}
