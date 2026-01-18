import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/core';
import { CompanionRule } from './entities/companion-rule.entity';
import { Vegetable } from '../vegetables/entities/vegetable.entity';
import { CreateCompanionRuleDto } from './dto/create-companion-rule.dto';
import { CompanionRelation } from '../common/enums/vegetable.enums';

@Injectable()
export class CompanionRulesService {
  constructor(
    @InjectRepository(CompanionRule)
    private readonly em: EntityManager,
  ) {}

  async create(data: CreateCompanionRuleDto): Promise<CompanionRule> {
    const source = await this.em.findOne(Vegetable, { id: data.sourceId });
    const target = await this.em.findOne(Vegetable, { id: data.targetId });

    if (!source || !target) throw new NotFoundException('Vegetables not found');

    // If a rule with same source/target/relation exists, return it (idempotent)
    const existing = await this.em.findOne(CompanionRule, {
      source,
      target,
      relation: data.relation,
    });

    if (existing) return existing;

    const rule = this.em.create(CompanionRule, {
      source,
      target,
      relation: data.relation as CompanionRelation,
      note: data.note,
    });

    await this.em.persistAndFlush(rule);
    return rule;
  }

  async delete(id: string): Promise<void> {
    const rule = await this.em.findOne(CompanionRule, { id });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.em.removeAndFlush(rule);
  }

  async findAll(): Promise<CompanionRule[]> {
    return this.em.find(CompanionRule, {}, { populate: ['source', 'target'] });
  }
}
