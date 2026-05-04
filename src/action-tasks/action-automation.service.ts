import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
  ActionTaskSource,
  ActionTaskSourceType,
  ActionTaskStatus,
  ActionTaskTargetType,
  ActionTemplateTarget,
} from '../common/enums/action.enums';
import { VegetableActionRule } from '../vegetables/vegetable-action-rule.entity';
import { ActionTask } from './action-task.entity';
import { Reminder } from '../reminders/reminder.entity';
import {
  ReminderAction,
  ReminderStatus,
  ReminderType,
} from '../common/enums/reminder.enums';
import { ActionTemplate } from '../action-templates/action-template.entity';
import {
  addDays,
  normalizeDueAt,
  toDateOnlyInTimezone,
} from '../common/types/date-utils';
import { PlantingStatus } from '../common/enums/planting.enums';
import { PlantingLifecycleTaskGenerator } from './generators/planting-lifecycle-task.generator';
import { RoutineCareTaskGenerator } from './generators/routine-care-task.generator';
import { PostHarvestPromptGenerator } from './generators/post-harvest-prompt.generator';
import { GeneratedTaskCandidate } from './generators/task-generation.types';

type DesiredOccurrence = {
  sourceKey: string;
  ruleId: string;
  cycleIndex: number;
  dueAt: Date;
};

const MAX_ACTIVE_TASKS_PER_PLANTING = 6;
const MAX_NEW_TASKS_PER_WEEK = 3;

@Injectable()
export class ActionAutomationService {
  private readonly logger = new Logger(ActionAutomationService.name);
  private readonly lifecycleGenerator = new PlantingLifecycleTaskGenerator();
  private readonly routineGenerator = new RoutineCareTaskGenerator();
  private readonly postHarvestPromptGenerator =
    new PostHarvestPromptGenerator();

  constructor(private readonly em: EntityManager) {}

  async recomputeForPlanting(params: {
    user: User;
    plantingId: string;
    reason: string;
    forceOverrideManual?: boolean;
    useLatestRules?: boolean;
  }) {
    return this.em.transactional(async (em) => {
      const planting = await em.findOne(
        Planting,
        { id: params.plantingId, user: params.user.id },
        { populate: ['bed', 'bed.growingSpace', 'vegetable'] },
      );

      if (!planting) {
        throw new NotFoundException('Planting not found');
      }

      if (params.useLatestRules) {
        planting.appliedRulesVersion = planting.vegetable.rulesVersion;
      } else if (
        planting.appliedRulesVersion !== planting.vegetable.rulesVersion
      ) {
        this.logger.log(
          `skip recompute for planting=${planting.id} due to rulesVersion mismatch applied=${planting.appliedRulesVersion} current=${planting.vegetable.rulesVersion}`,
        );

        return {
          plantingId: planting.id,
          reason: params.reason,
          desiredCount: 0,
          skipped: true,
          mismatch: {
            appliedRulesVersion: planting.appliedRulesVersion,
            currentRulesVersion: planting.vegetable.rulesVersion,
          },
        };
      }

      const rules = await em.find(
        VegetableActionRule,
        {
          vegetable: planting.vegetable.id,
          isEnabled: true,
        },
        {
          populate: ['actionTemplate'],
          orderBy: [{ createdAt: 'asc' }, { offsetDays: 'asc' }],
        },
      );

      if (
        planting.status === PlantingStatus.FAILED ||
        planting.status === PlantingStatus.CANCELLED ||
        planting.status === PlantingStatus.HARVESTED ||
        planting.status === PlantingStatus.CLEARED
      ) {
        await this.cleanupStaleGeneratedTasksForPlanting({
          user: params.user,
          planting,
          desired: [],
          forceOverrideManual: Boolean(params.forceOverrideManual),
          em,
        });

        await em.flush();

        return {
          plantingId: planting.id,
          reason: params.reason,
          desiredCount: 0,
        };
      }

      const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
      const candidates = this.buildCandidatesForPlanting(planting, rules);
      const floodFiltered = await this.applyAntiFloodLimits({
        em,
        user: params.user,
        planting,
        candidates,
      });

      const desired: DesiredOccurrence[] = floodFiltered.accepted.map(
        (candidate) => ({
          sourceKey: candidate.sourceKey,
          ruleId: candidate.rule.id,
          cycleIndex: candidate.cycleIndex,
          dueAt: candidate.dueAt,
        }),
      );

      for (const occurrence of desired) {
        const rule = rulesById.get(occurrence.ruleId);
        if (!rule) continue;

        await this.upsertGeneratedTaskAndReminder({
          user: params.user,
          planting,
          rule,
          dueAt: occurrence.dueAt,
          cycleIndex: occurrence.cycleIndex,
          sourceKey: occurrence.sourceKey,
          forceOverrideManual: Boolean(params.forceOverrideManual),
          em,
        });
      }

      await this.cleanupStaleGeneratedTasksForPlanting({
        user: params.user,
        planting,
        desired,
        forceOverrideManual: Boolean(params.forceOverrideManual),
        em,
      });

      await em.flush();

      this.logger.log(
        `recomputed actions for planting=${planting.id} reason=${params.reason} desired=${desired.length}`,
      );

      return {
        plantingId: planting.id,
        reason: params.reason,
        desiredCount: desired.length,
        skippedByFloodLimits: floodFiltered.skipped,
      };
    });
  }

  async getPostHarvestActionSuggestions(vegetableId: string) {
    const rules = await this.em.find(
      VegetableActionRule,
      {
        vegetable: vegetableId,
        trigger: ActionRuleTrigger.ON_HARVEST_CONFIRMED,
        isEnabled: true,
      },
      {
        populate: ['actionTemplate'],
        orderBy: [{ offsetDays: 'asc' }, { createdAt: 'asc' }],
      },
    );

    return this.postHarvestPromptGenerator.generate(rules);
  }

  async previewForPlanting(user: User, plantingId: string) {
    const planting = await this.em.findOne(
      Planting,
      { id: plantingId, user: user.id },
      { populate: ['bed', 'bed.growingSpace', 'vegetable'] },
    );

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    const rules = await this.em.find(
      VegetableActionRule,
      {
        vegetable: planting.vegetable.id,
        isEnabled: true,
      },
      {
        populate: ['actionTemplate'],
        orderBy: [{ createdAt: 'asc' }, { offsetDays: 'asc' }],
      },
    );

    const candidates = this.buildCandidatesForPlanting(planting, rules);
    const floodFiltered = await this.applyAntiFloodLimits({
      em: this.em,
      user,
      planting,
      candidates,
    });

    return {
      plantingId: planting.id,
      totalCandidates: candidates.length,
      acceptedCandidates: floodFiltered.accepted.map((candidate) => ({
        sourceKey: candidate.sourceKey,
        dueAt: candidate.dueAt,
        trigger: candidate.trigger,
        kind: candidate.kind,
        actionTemplate: {
          id: candidate.rule.actionTemplate.id,
          name: candidate.rule.actionTemplate.name,
          generationMode: candidate.rule.actionTemplate.generationMode,
        },
      })),
      skippedByFloodLimits: floodFiltered.skipped,
    };
  }

  async getCoverage() {
    const templates = await this.em.find(ActionTemplate, {});
    const byGenerationMode = templates.reduce<Record<string, number>>(
      (acc, template) => {
        const mode = String(template.generationMode ?? 'MANUAL_ONLY');
        acc[mode] = (acc[mode] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const rules = await this.em.count(VegetableActionRule, { isEnabled: true });

    return {
      templatesTotal: templates.length,
      enabledRulesTotal: rules,
      byGenerationMode,
      antiFloodLimits: {
        maxActiveTasksPerPlanting: MAX_ACTIVE_TASKS_PER_PLANTING,
        maxNewTasksPerWeek: MAX_NEW_TASKS_PER_WEEK,
      },
    };
  }

  private async upsertGeneratedTaskAndReminder(params: {
    user: User;
    planting: Planting;
    rule: VegetableActionRule;
    dueAt: Date;
    cycleIndex: number;
    sourceKey: string;
    forceOverrideManual: boolean;
    em: EntityManager;
  }) {
    const existing = await params.em.findOne(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceKey: params.sourceKey,
    });

    if (existing) {
      if (existing.status === ActionTaskStatus.DONE) {
        return;
      }

      if (existing.suppressedAt && !params.forceOverrideManual) {
        return;
      }

      if (
        (existing.isManuallyRescheduled || existing.isUserModified) &&
        !params.forceOverrideManual
      ) {
        return;
      }

      await this.upsertReminderForTask(
        params.em,
        existing,
        params.rule.actionTemplate,
      );
      return;
    }

    const task = new ActionTask();
    task.user = params.user;
    task.actionTemplate = params.rule.actionTemplate;
    task.title = params.rule.actionTemplate.name;
    task.description = params.rule.actionTemplate.description ?? null;
    task.status = ActionTaskStatus.PENDING;
    task.source = ActionTaskSource.VEGETABLE_RULE;
    task.sourceType = ActionTaskSourceType.AUTOMATION;
    task.sourceRefId = params.rule.id;
    task.sourceKey = params.sourceKey;
    task.dedupeKey = params.sourceKey;
    task.cycleIndex = params.cycleIndex;
    task.dueAt = params.dueAt;
    task.originalDueAt = params.dueAt;
    task.isManuallyRescheduled = false;
    task.isUserModified = false;
    task.suppressedAt = null;
    task.generatedAt = new Date();

    if (params.rule.actionTemplate.target === ActionTemplateTarget.BED) {
      task.targetType = ActionTaskTargetType.BED;
      task.bed = params.planting.bed;
      task.planting = null;
      task.growingSpace = null;
    } else if (
      params.rule.actionTemplate.target === ActionTemplateTarget.SPACE
    ) {
      task.targetType = ActionTaskTargetType.SPACE;
      task.growingSpace = params.planting.bed.growingSpace;
      task.planting = null;
      task.bed = null;
    } else {
      task.targetType = ActionTaskTargetType.PLANTING;
      task.planting = params.planting;
      task.bed = null;
      task.growingSpace = null;
    }

    params.em.persist(task);
    await params.em.flush();

    await this.upsertReminderForTask(
      params.em,
      task,
      params.rule.actionTemplate,
    );
  }

  private async upsertReminderForTask(
    em: EntityManager,
    task: ActionTask,
    template: ActionTemplate,
  ) {
    await em.nativeUpdate(
      Reminder,
      {
        actionTaskId: task.id,
        status: { $in: [ReminderStatus.PENDING, ReminderStatus.PROCESSING] },
      },
      {
        status: ReminderStatus.CANCELED,
        lockedAt: null,
        lastError: null,
      },
    );

    const reminder = new Reminder();
    reminder.user = task.user;
    reminder.type = ReminderType.ACTION_TASK_DUE;
    reminder.status = ReminderStatus.PENDING;
    reminder.scheduledAt = task.dueAt as Date;
    reminder.actionTaskId = task.id;
    reminder.payload = {
      kind: 'action',
      actionTaskId: task.id,
      actionTemplateId: template.id,
      actionTemplateName: template.name,
      bedId: task.bed?.id,
      plantingId: task.planting?.id,
      growingSpaceId: task.growingSpace?.id,
      action: ReminderAction.CHECK,
    };
    reminder.attempts = 0;
    reminder.lockedAt = null;
    reminder.lastError = null;

    em.persist(reminder);
  }

  private async cleanupStaleGeneratedTasksForPlanting(params: {
    user: User;
    planting: Planting;
    desired: DesiredOccurrence[];
    forceOverrideManual: boolean;
    em: EntityManager;
  }) {
    const desiredKeys = new Set(params.desired.map((item) => item.sourceKey));

    const generated = await params.em.find(
      ActionTask,
      {
        user: params.user.id,
        source: ActionTaskSource.VEGETABLE_RULE,
        sourceType: ActionTaskSourceType.AUTOMATION,
        status: ActionTaskStatus.PENDING,
        $or: [
          { planting: params.planting.id },
          { bed: params.planting.bed.id },
          { growingSpace: params.planting.bed.growingSpace.id },
        ],
      },
      { populate: ['planting', 'bed', 'growingSpace'] },
    );

    for (const task of generated) {
      if (task.status === ActionTaskStatus.DONE) {
        continue;
      }
      if (
        (task.isManuallyRescheduled || task.isUserModified) &&
        !params.forceOverrideManual
      ) {
        continue;
      }

      const key = task.sourceKey ?? '';
      if (desiredKeys.has(key)) {
        continue;
      }

      task.status = ActionTaskStatus.CANCELED;

      await params.em.nativeUpdate(
        Reminder,
        {
          actionTaskId: task.id,
          status: { $in: [ReminderStatus.PENDING, ReminderStatus.PROCESSING] },
        },
        {
          status: ReminderStatus.CANCELED,
          lockedAt: null,
          lastError: null,
        },
      );
    }
  }

  private resolveRuleBaseDueAt(
    planting: Planting,
    rule: VegetableActionRule,
  ): Date | null {
    const sowingBaseDate =
      planting.sowedAt ?? planting.actualStartDate ?? planting.plannedStartDate;

    switch (rule.trigger) {
      case ActionRuleTrigger.ON_SOWED:
        return sowingBaseDate
          ? normalizeDueAt(sowingBaseDate, planting.timelineTimezone)
          : null;
      case ActionRuleTrigger.AFTER_SOWING_DAYS:
        return sowingBaseDate
          ? normalizeDueAt(
              addDays(sowingBaseDate, rule.offsetDays),
              planting.timelineTimezone,
            )
          : null;
      case ActionRuleTrigger.ON_TRANSPLANTED:
        return planting.transplantedAt
          ? normalizeDueAt(planting.transplantedAt, planting.timelineTimezone)
          : null;
      case ActionRuleTrigger.AFTER_TRANSPLANT_DAYS:
        return planting.transplantedAt
          ? normalizeDueAt(
              addDays(planting.transplantedAt, rule.offsetDays),
              planting.timelineTimezone,
            )
          : null;
      case ActionRuleTrigger.BEFORE_TRANSPLANT_DAYS:
        return planting.transplantedAt
          ? normalizeDueAt(
              addDays(planting.transplantedAt, -rule.offsetDays),
              planting.timelineTimezone,
            )
          : null;
      case ActionRuleTrigger.ON_HARVEST_WINDOW_START:
        return planting.harvestWindowStart
          ? normalizeDueAt(
              planting.harvestWindowStart,
              planting.timelineTimezone,
            )
          : null;
      case ActionRuleTrigger.BEFORE_HARVEST_WINDOW_START_DAYS:
        return planting.harvestWindowStart
          ? normalizeDueAt(
              addDays(planting.harvestWindowStart, -rule.offsetDays),
              planting.timelineTimezone,
            )
          : null;
      case ActionRuleTrigger.AFTER_HARVEST_DAYS:
        return planting.harvestedAt
          ? normalizeDueAt(
              addDays(planting.harvestedAt, rule.offsetDays),
              planting.timelineTimezone,
            )
          : null;
      case ActionRuleTrigger.ON_HARVEST_CONFIRMED:
      default:
        return null;
    }
  }

  private buildOccurrences(
    planting: Planting,
    rule: VegetableActionRule,
    firstDueAt: Date,
    options?: {
      routineOnly?: boolean;
    },
  ) {
    if (rule.schedule === ActionRuleSchedule.ONCE) {
      return [{ cycleIndex: 0, dueAt: firstDueAt }];
    }

    const step = rule.everyNDays ?? 1;

    const stopAt =
      rule.occurrencesLimit != null
        ? null
        : (planting.harvestedAt ??
          planting.harvestWindowEnd ??
          addDays(firstDueAt, 120));

    const occurrences: Array<{ cycleIndex: number; dueAt: Date }> = [];
    let cycle = 0;
    let cursor = firstDueAt;
    const now = normalizeDueAt(new Date(), planting.timelineTimezone);

    while (true) {
      if (rule.occurrencesLimit != null && cycle >= rule.occurrencesLimit) {
        break;
      }

      if (
        stopAt &&
        cursor > normalizeDueAt(stopAt, planting.timelineTimezone)
      ) {
        break;
      }

      occurrences.push({ cycleIndex: cycle, dueAt: cursor });

      if (options?.routineOnly) {
        const upcoming = occurrences.filter(
          (occurrence) => occurrence.dueAt >= now,
        );
        if (upcoming.length >= 2) {
          return upcoming.slice(0, 2);
        }
      }

      cycle += 1;
      cursor = normalizeDueAt(addDays(cursor, step), planting.timelineTimezone);
    }

    if (options?.routineOnly) {
      return occurrences.filter((occurrence) => occurrence.dueAt >= now);
    }

    return occurrences;
  }

  private buildCandidatesForPlanting(
    planting: Planting,
    rules: VegetableActionRule[],
  ): GeneratedTaskCandidate[] {
    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
    const context = { planting, rules };

    const lifecycleCandidates = this.lifecycleGenerator.generate(
      context,
      (ruleId) => {
        const rule = rulesById.get(ruleId);
        if (!rule) return null;

        if (
          rule.applyIfStartMethod &&
          rule.applyIfStartMethod.length > 0 &&
          !rule.applyIfStartMethod.includes(planting.startMethod)
        ) {
          return null;
        }

        return this.resolveRuleBaseDueAt(planting, rule);
      },
      (ruleId, firstDueAt) => {
        const rule = rulesById.get(ruleId);
        if (!rule) return [];

        return this.buildOccurrences(planting, rule, firstDueAt, {
          routineOnly: false,
        }).slice(0, 1);
      },
    );

    const routineCandidates = this.routineGenerator.generate(
      context,
      (ruleId) => {
        const rule = rulesById.get(ruleId);
        if (!rule) return null;

        if (
          rule.applyIfStartMethod &&
          rule.applyIfStartMethod.length > 0 &&
          !rule.applyIfStartMethod.includes(planting.startMethod)
        ) {
          return null;
        }

        return this.resolveRuleBaseDueAt(planting, rule);
      },
      (ruleId, firstDueAt) => {
        const rule = rulesById.get(ruleId);
        if (!rule) return [];

        return this.buildOccurrences(planting, rule, firstDueAt, {
          routineOnly: true,
        });
      },
    );

    const todayInTz = toDateOnlyInTimezone(new Date(), planting.timelineTimezone);

    return [...lifecycleCandidates, ...routineCandidates]
      .filter(
        (candidate) =>
          toDateOnlyInTimezone(candidate.dueAt, planting.timelineTimezone).getTime() ===
          todayInTz.getTime(),
      )
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  }

  private async applyAntiFloodLimits(params: {
    em: EntityManager;
    user: User;
    planting: Planting;
    candidates: GeneratedTaskCandidate[];
  }): Promise<{
    accepted: GeneratedTaskCandidate[];
    skipped: Array<{ sourceKey: string; reason: string }>;
  }> {
    const plantingScope = this.getPlantingScopeWhere(params.planting);

    const existingTasks = await params.em.find(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceType: ActionTaskSourceType.AUTOMATION,
      sourceKey: {
        $in: params.candidates.map((candidate) => candidate.sourceKey),
      },
    });
    const existingKeys = new Set(
      existingTasks
        .map((task) => task.sourceKey)
        .filter((value): value is string => Boolean(value)),
    );

    let activeTasks = await params.em.count(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceType: ActionTaskSourceType.AUTOMATION,
      status: ActionTaskStatus.PENDING,
      ...plantingScope,
    });

    const weekStart = this.startOfCurrentWeek();
    let newTasksThisWeek = await params.em.count(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceType: ActionTaskSourceType.AUTOMATION,
      createdAt: { $gte: weekStart },
      ...plantingScope,
    });

    const accepted: GeneratedTaskCandidate[] = [];
    const skipped: Array<{ sourceKey: string; reason: string }> = [];

    for (const candidate of params.candidates) {
      if (existingKeys.has(candidate.sourceKey)) {
        accepted.push(candidate);
        continue;
      }

      if (activeTasks >= MAX_ACTIVE_TASKS_PER_PLANTING) {
        skipped.push({ sourceKey: candidate.sourceKey, reason: 'MAX_ACTIVE' });
        continue;
      }

      if (newTasksThisWeek >= MAX_NEW_TASKS_PER_WEEK) {
        skipped.push({
          sourceKey: candidate.sourceKey,
          reason: 'MAX_WEEKLY_NEW',
        });
        continue;
      }

      accepted.push(candidate);
      activeTasks += 1;
      newTasksThisWeek += 1;
    }

    return { accepted, skipped };
  }

  private getPlantingScopeWhere(planting: Planting) {
    return {
      $or: [
        { planting: planting.id },
        { bed: planting.bed.id },
        { growingSpace: planting.bed.growingSpace.id },
      ],
    };
  }

  private startOfCurrentWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = (day + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
}
