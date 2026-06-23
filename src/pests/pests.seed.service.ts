import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultPests } from './default-pests.seed';

@Injectable()
export class PestsSeedService implements OnModuleInit {
  private readonly logger = new Logger(PestsSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultPests(this.em, this.logger);
    this.em.clear();
    this.logger.log('Default pests upserted');
  }
}
