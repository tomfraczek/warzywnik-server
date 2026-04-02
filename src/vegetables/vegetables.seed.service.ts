import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { upsertDefaultVegetables } from './default-vegetables.seed';

@Injectable()
export class VegetablesSeedService implements OnModuleInit {
  private readonly logger = new Logger(VegetablesSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    await upsertDefaultVegetables(this.em, (message) =>
      this.logger.warn(message),
    );
    this.logger.log('Default vegetables upserted');
  }
}
