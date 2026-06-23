import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultPlanChecklistTemplates } from './default-plan-checklist-templates.seed';

@Injectable()
export class PlanChecklistTemplatesSeedService implements OnModuleInit {
  private readonly logger = new Logger(PlanChecklistTemplatesSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultPlanChecklistTemplates(this.em);
    this.em.clear();
    this.logger.log('Default plan checklist templates upserted');
  }
}
