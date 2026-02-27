import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WarningRule } from './warning-rule.entity';
import { WarningCode, WarningSeverity } from '../common/enums/warning.enums';
import { Bed } from '../beds/bed.entity';

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
  private readonly logger = new Logger(WarningsService.name);
  private readonly unresolvedPlaceholderPattern = /\{\s*([^{}]+?)\s*\}/g;

  constructor(private readonly em: EntityManager) {}

  private normalizeTemplateKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  private applyTemplate(
    template: string,
    values: Record<string, string | number>,
  ) {
    const normalizedValues = new Map<string, string | number>();

    for (const [key, value] of Object.entries(values)) {
      normalizedValues.set(this.normalizeTemplateKey(key), value);
    }

    return template.replace(
      /\{\s*([^{}]+?)\s*\}/g,
      (_match, rawKey: string) => {
        const key = rawKey.trim();
        const directValue = values[key];
        if (directValue !== undefined) {
          return String(directValue);
        }

        const normalizedValue = normalizedValues.get(
          this.normalizeTemplateKey(key),
        );
        return normalizedValue !== undefined
          ? String(normalizedValue)
          : `{${key}}`;
      },
    );
  }

  private hasUnresolvedPlaceholders(text: string | null | undefined): boolean {
    return !!text && /\{\s*[^{}]+\s*\}/.test(text);
  }

  private fallbackForPlaceholder(key: string): string {
    const normalized = this.normalizeTemplateKey(key);

    if (normalized === 'bedname') {
      return 'Twoja lokalizacja';
    }

    if (normalized === 'vegetablename') {
      return 'Twoja roślina';
    }

    return '';
  }

  private sanitizeRenderedText(
    text: string | null | undefined,
  ): string | null | undefined {
    if (text === null || text === undefined) {
      return text;
    }

    const withoutRawPlaceholders = text.replace(
      this.unresolvedPlaceholderPattern,
      (_match, rawKey: string) => this.fallbackForPlaceholder(rawKey.trim()),
    );

    return withoutRawPlaceholders
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim();
  }

  private extractDetailString(
    details: Record<string, unknown> | null | undefined,
    key: string,
  ): string | null {
    const value = details?.[key];
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : null;
  }

  private async resolveTemplateValues(
    candidate: WarningCandidate,
    bedNameById: Map<string, string>,
  ): Promise<Record<string, string | number>> {
    const resolvedValues = { ...candidate.values };

    const hasBedNameValue =
      typeof resolvedValues.bedName === 'string' &&
      resolvedValues.bedName.trim().length > 0;
    if (hasBedNameValue) {
      return resolvedValues;
    }

    const details = candidate.details ?? null;
    const detailsBedName = this.extractDetailString(details, 'bedName');
    if (detailsBedName) {
      resolvedValues.bedName = detailsBedName;
      return resolvedValues;
    }

    const bedId = this.extractDetailString(details, 'bedId');
    if (!bedId) {
      return resolvedValues;
    }

    const cachedBedName = bedNameById.get(bedId);
    if (cachedBedName) {
      resolvedValues.bedName = cachedBedName;
      return resolvedValues;
    }

    const bed = await this.em.findOne(Bed, { id: bedId });
    if (bed?.name) {
      bedNameById.set(bedId, bed.name);
      resolvedValues.bedName = bed.name;
    }

    return resolvedValues;
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

    const outputs: WarningOutput[] = [];
    const bedNameById = new Map<string, string>();

    for (const candidate of candidates) {
      const rule = rules.get(candidate.code);
      if (!rule) continue;
      if (!rule.enabled || !rule.isActive) continue;

      const resolvedValues = await this.resolveTemplateValues(
        candidate,
        bedNameById,
      );

      const message = this.applyTemplate(rule.messageTemplate, resolvedValues);
      const hint = rule.hintTemplate
        ? this.applyTemplate(rule.hintTemplate, resolvedValues)
        : null;

      const sanitizedMessage =
        this.sanitizeRenderedText(message) || 'Sprawdź ostrzeżenie pogodowe.';
      const sanitizedHint = this.sanitizeRenderedText(hint);
      const finalHint =
        typeof sanitizedHint === 'string' && sanitizedHint.length === 0
          ? null
          : sanitizedHint;

      if (
        this.hasUnresolvedPlaceholders(sanitizedMessage) ||
        this.hasUnresolvedPlaceholders(finalHint)
      ) {
        this.logger.warn(
          `unresolved placeholder(s) code=${candidate.code} values=${JSON.stringify(
            resolvedValues,
          )}`,
        );
      }

      outputs.push({
        code: candidate.code,
        severity: rule.severity,
        title: rule.title,
        message: sanitizedMessage,
        hint: finalHint ?? undefined,
        details: candidate.details ?? undefined,
      });
    }

    return outputs;
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
