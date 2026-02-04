import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WarningRule } from './warning-rule.entity';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';

type WarningOutput = {
  code: WarningCode;
  severity: WarningSeverity;
  title: string;
  message: string;
  hint?: string | null;
  details?: Record<string, unknown> | null;
};

@Injectable()
export class WarningsService {
  constructor(private readonly em: EntityManager) {}

  private applyTemplate(
    template: string,
    values: Record<string, string | number>,
  ) {
    return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
      const value = values[key];
      return value !== undefined ? String(value) : `{${key}}`;
    });
  }

  async buildWarning(
    code: WarningCode,
    values: Record<string, string | number>,
    details?: Record<string, unknown> | null,
  ): Promise<WarningOutput | null> {
    const rule = await this.em.findOne(WarningRule, { code });

    if (!rule) {
      return null;
    }

    if (!rule.enabled) {
      return null;
    }

    const message = this.applyTemplate(rule.messageTemplate, values);
    const hint = rule.hintTemplate
      ? this.applyTemplate(rule.hintTemplate, values)
      : null;

    return {
      code,
      severity: rule.severity,
      title: rule.title,
      message,
      hint: hint ?? undefined,
      details: details ?? undefined,
    };
  }
}
