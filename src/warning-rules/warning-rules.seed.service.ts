import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultWarningRules } from './default-warning-rules.seed';

@Injectable()
export class WarningRulesSeedService implements OnModuleInit {
  private readonly logger = new Logger(WarningRulesSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultWarningRules(this.em);
    this.logger.log('Default warning rules upserted');
  }
}
