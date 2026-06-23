import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultActionTemplates } from './default-action-templates.seed';

@Injectable()
export class ActionTemplatesSeedService implements OnModuleInit {
  private readonly logger = new Logger(ActionTemplatesSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultActionTemplates(this.em);
    this.em.clear();
    this.logger.log('Default action templates upserted');
  }
}
