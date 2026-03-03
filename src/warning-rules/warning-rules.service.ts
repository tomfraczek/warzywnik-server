import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WarningRule } from './warning-rule.entity';
import {
  CreateWarningRuleDto,
  ListWarningRulesQueryDto,
  UpdateWarningRuleDto,
} from './dto/warning-rule.schemas';
import {
  WarningCode,
  WarningRuleCategory,
  WarningRuleDayPart,
  WarningRuleHorizon,
  WarningSeverity,
} from '../common/enums/warning.enums';

const isUuid = (value: string): boolean => /^[0-9a-fA-F-]{36}$/.test(value);

@Injectable()
export class WarningRulesService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListWarningRulesQueryDto) {
    const { page, limit, q, enabled, severity } = query;
    const category = (query as { category?: WarningRuleCategory }).category;
    const horizon = (query as { horizon?: WarningRuleHorizon }).horizon;
    const dayPart = (query as { dayPart?: WarningRuleDayPart }).dayPart;
    const generatesTask = (query as { generatesTask?: boolean }).generatesTask;

    const where: Record<string, unknown> = {};

    if (q) {
      where.title = { $ilike: `%${q}%` };
    }

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    if (severity) {
      where.severity = severity;
    }

    if (category) {
      where.category = category;
    }

    if (horizon) {
      where.horizon = horizon;
    }

    if (dayPart) {
      where.dayPart = dayPart;
    }

    if (generatesTask !== undefined) {
      where.generatesTask = generatesTask;
    }

    const [items, total] = await this.em.findAndCount(WarningRule, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { title: 'asc' },
    });

    return {
      items,
      page,
      limit,
      total,
    };
  }

  async getByIdOrCode(idOrCode: string) {
    let entity: WarningRule | null = null;

    if (isUuid(idOrCode)) {
      entity = await this.em.findOne(WarningRule, { id: idOrCode });
    } else if (Object.values(WarningCode).includes(idOrCode as WarningCode)) {
      entity = await this.em.findOne(WarningRule, {
        code: idOrCode as WarningCode,
      });
    }

    if (!entity) {
      throw new NotFoundException('Warning rule not found');
    }

    return entity;
  }

  async create(dto: CreateWarningRuleDto) {
    const existing = await this.em.findOne(WarningRule, { code: dto.code });
    if (existing) {
      throw new ConflictException('Warning rule code already exists');
    }

    const rule = new WarningRule();
    rule.code = dto.code;
    rule.enabled = dto.enabled ?? true;
    rule.category = dto.category ?? WarningRuleCategory.WEATHER_OUTDOOR;
    rule.horizon = dto.horizon ?? WarningRuleHorizon.RADAR;
    rule.dayPart = dto.dayPart ?? WarningRuleDayPart.ANY;
    rule.generatesTask = dto.generatesTask ?? false;
    rule.severity = dto.severity ?? WarningSeverity.WARNING;
    rule.title = dto.title;
    rule.messageTemplate = dto.messageTemplate;
    rule.hintTemplate = dto.hintTemplate ?? null;
    rule.blocking = dto.blocking ?? false;
    rule.cooldownDays = dto.cooldownDays ?? null;
    rule.isActive = dto.isActive ?? true;

    await this.em.persistAndFlush(rule);
    return rule;
  }

  async update(id: string, dto: UpdateWarningRuleDto) {
    const rule = await this.em.findOne(WarningRule, { id });
    if (!rule) {
      throw new NotFoundException('Warning rule not found');
    }

    if (dto.code && dto.code !== rule.code) {
      const existing = await this.em.findOne(WarningRule, { code: dto.code });
      if (existing) {
        throw new ConflictException('Warning rule code already exists');
      }
      rule.code = dto.code;
    }

    if (dto.enabled !== undefined) {
      rule.enabled = dto.enabled;
    }

    if (dto.severity !== undefined) {
      rule.severity = dto.severity;
    }

    if (dto.category !== undefined) {
      rule.category = dto.category;
    }

    if (dto.horizon !== undefined) {
      rule.horizon = dto.horizon;
    }

    if (dto.dayPart !== undefined) {
      rule.dayPart = dto.dayPart;
    }

    if (dto.generatesTask !== undefined) {
      rule.generatesTask = dto.generatesTask;
    }

    if (dto.title !== undefined) {
      rule.title = dto.title;
    }

    if (dto.messageTemplate !== undefined) {
      rule.messageTemplate = dto.messageTemplate;
    }

    if (dto.hintTemplate !== undefined) {
      rule.hintTemplate = dto.hintTemplate;
    }

    if (dto.blocking !== undefined) {
      rule.blocking = dto.blocking;
    }

    if (dto.cooldownDays !== undefined) {
      rule.cooldownDays = dto.cooldownDays;
    }

    if (dto.isActive !== undefined) {
      rule.isActive = dto.isActive;
    }

    await this.em.flush();
    return rule;
  }

  async remove(id: string) {
    const rule = await this.em.findOne(WarningRule, { id });
    if (!rule) {
      throw new NotFoundException('Warning rule not found');
    }

    await this.em.removeAndFlush(rule);
  }
}
