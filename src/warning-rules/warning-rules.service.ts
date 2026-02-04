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
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';

const isUuid = (value: string): boolean => /^[0-9a-fA-F-]{36}$/.test(value);

const defaultWarningRules: Array<
  Omit<WarningRule, 'id' | 'createdAt' | 'updatedAt'> & { code: WarningCode }
> = [
  {
    code: WarningCode.SOIL_NOT_RECOMMENDED,
    enabled: true,
    severity: WarningSeverity.WARNING,
    title: 'Soil not recommended',
    messageTemplate:
      '{vegetableName} may not thrive in the soil used in {bedName}.',
    hintTemplate: 'Choose a soil that matches the crop requirements.',
    blocking: false,
    cooldownDays: null,
    isActive: true,
  },
  {
    code: WarningCode.PH_OUT_OF_RANGE,
    enabled: true,
    severity: WarningSeverity.WARNING,
    title: 'pH out of range',
    messageTemplate:
      'Measured pH {measuredPh} is outside the recommended range {recommendedPhMin}-{recommendedPhMax} for {vegetableName}.',
    hintTemplate: 'Adjust soil pH before planting if possible.',
    blocking: false,
    cooldownDays: null,
    isActive: true,
  },
  {
    code: WarningCode.DEPTH_TOO_SMALL,
    enabled: true,
    severity: WarningSeverity.WARNING,
    title: 'Soil depth too small',
    messageTemplate:
      '{bedName} has depth {bedDepthCm} cm, but {vegetableName} needs at least {requiredDepthCm} cm.',
    hintTemplate: 'Increase bed depth or choose a shallower-rooted crop.',
    blocking: false,
    cooldownDays: null,
    isActive: true,
  },
  {
    code: WarningCode.NPK_TOO_LOW,
    enabled: true,
    severity: WarningSeverity.WARNING,
    title: 'Nutrient level too low',
    messageTemplate:
      'Measured {nutrient} level ({measuredLevel}) is below {needLevel} for {vegetableName}.',
    hintTemplate: 'Consider improving soil fertility before planting.',
    blocking: false,
    cooldownDays: null,
    isActive: true,
  },
  {
    code: WarningCode.ROTATION_RISK,
    enabled: true,
    severity: WarningSeverity.WARNING,
    title: 'Rotation risk',
    messageTemplate:
      '{vegetableName} may be at risk due to recent crop rotation in {bedName}.',
    hintTemplate: 'Rotate crops to reduce disease and pest pressure.',
    blocking: false,
    cooldownDays: null,
    isActive: true,
  },
  {
    code: WarningCode.WATER_RETENTION_MISMATCH,
    enabled: true,
    severity: WarningSeverity.WARNING,
    title: 'Water retention mismatch',
    messageTemplate:
      '{bedName} water retention may not match {vegetableName} needs.',
    hintTemplate: 'Adjust soil composition or irrigation strategy.',
    blocking: false,
    cooldownDays: null,
    isActive: true,
  },
  {
    code: WarningCode.DRAINAGE_MISMATCH,
    enabled: true,
    severity: WarningSeverity.WARNING,
    title: 'Drainage mismatch',
    messageTemplate: '{bedName} drainage may not match {vegetableName} needs.',
    hintTemplate: 'Improve drainage or select a better-suited crop.',
    blocking: false,
    cooldownDays: null,
    isActive: true,
  },
];

@Injectable()
export class WarningRulesService {
  constructor(private readonly em: EntityManager) {}

  async onModuleInit() {
    await this.ensureDefaultWarningRules();
  }

  async ensureDefaultWarningRules() {
    for (const rule of defaultWarningRules) {
      const existing = await this.em.findOne(WarningRule, {
        code: rule.code,
      });

      if (!existing) {
        const entity = new WarningRule();
        entity.code = rule.code;
        entity.enabled = rule.enabled;
        entity.severity = rule.severity;
        entity.title = rule.title;
        entity.messageTemplate = rule.messageTemplate;
        entity.hintTemplate = rule.hintTemplate ?? null;
        entity.blocking = rule.blocking;
        entity.cooldownDays = rule.cooldownDays ?? null;
        entity.isActive = rule.isActive;
        this.em.persist(entity);
      }
    }

    await this.em.flush();
  }

  async list(query: ListWarningRulesQueryDto) {
    const { page, limit, q, enabled, severity } = query;

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
