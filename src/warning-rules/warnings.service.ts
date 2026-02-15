import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WarningRule } from './warning-rule.entity';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';

export type WarningOutput = {
  code: WarningCode;
  severity: WarningSeverity;
  title: string;
  message: string;
  hint?: string | null;
  details?: Record<string, unknown> | null;
};

export type WarningCandidate = {
  code: WarningCode;
  values: Record<string, string | number>;
  details?: Record<string, unknown> | null;
};

export type WarningRulesMap = Map<WarningCode, WarningRule>;

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

  async getRulesMap(codes: WarningCode[]): Promise<WarningRulesMap> {
    if (codes.length === 0) return new Map();

    const rules = await this.em.find(WarningRule, {
      code: { $in: Array.from(new Set(codes)) },
    });

    return new Map(rules.map((rule) => [rule.code, rule]));
  }

  async buildWarnings(
    candidates: WarningCandidate[],
    rulesMap?: WarningRulesMap,
  ): Promise<WarningOutput[]> {
    if (candidates.length === 0) return [];

    const codes = candidates.map((candidate) => candidate.code);
    const rules = rulesMap ?? (await this.getRulesMap(codes));

    return candidates.reduce<WarningOutput[]>((acc, candidate) => {
      const rule = rules.get(candidate.code);
      if (!rule) return acc;
      if (!rule.enabled || !rule.isActive) return acc;

      const message = this.applyTemplate(
        rule.messageTemplate,
        candidate.values,
      );
      const hint = rule.hintTemplate
        ? this.applyTemplate(rule.hintTemplate, candidate.values)
        : null;

      acc.push({
        code: candidate.code,
        severity: rule.severity,
        title: rule.title,
        message,
        hint: hint ?? undefined,
        details: candidate.details ?? undefined,
      });

      return acc;
    }, []);
  }

  async buildWarning(
    code: WarningCode,
    values: Record<string, string | number>,
    details?: Record<string, unknown> | null,
  ): Promise<WarningOutput | null> {
    const [warning] = await this.buildWarnings([{ code, values, details }]);
    return warning ?? null;
  }
}
