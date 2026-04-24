import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
  ActionTaskSource,
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
import { addDays, normalizeDueAt } from '../common/types/date-utils';
import { PlantingStatus } from '../common/enums/planting.enums';

type DesiredOccurrence = {
  ruleId: string;
  cycleIndex: number;
  dueAt: Date;
};

@Injectable()
export class ActionAutomationService {
  private readonly logger = new Logger(ActionAutomationService.name);

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

      const generationRules = rules.filter(
        (rule) => rule.trigger !== ActionRuleTrigger.ON_HARVEST_CONFIRMED,
      );

      const desired: DesiredOccurrence[] = [];

      for (const rule of generationRules) {
        if (
          rule.applyIfStartMethod &&
          rule.applyIfStartMethod.length > 0 &&
          !rule.applyIfStartMethod.includes(planting.startMethod)
        ) {
          continue;
        }

        const firstDueAt = this.resolveRuleBaseDueAt(planting, rule);
        if (!firstDueAt) {
          this.logger.debug(
            `skip rule=${rule.id} trigger=${rule.trigger} because base date is missing`,
          );
          continue;
        }

        const occurrences = this.buildOccurrences(planting, rule, firstDueAt);
        desired.push(
          ...occurrences.map((occ) => ({
            ruleId: rule.id,
            cycleIndex: occ.cycleIndex,
            dueAt: occ.dueAt,
          })),
        );

        for (const occurrence of occurrences) {
          await this.upsertGeneratedTaskAndReminder({
            user: params.user,
            planting,
            rule,
            dueAt: occurrence.dueAt,
            cycleIndex: occurrence.cycleIndex,
            forceOverrideManual: Boolean(params.forceOverrideManual),
            em,
          });
        }
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

    return rules.map((rule) => ({
      actionTemplate: {
        id: rule.actionTemplate.id,
        name: rule.actionTemplate.name,
        scope: rule.actionTemplate.target,
        target: rule.actionTemplate.target,
        environment: rule.actionTemplate.environment,
        type: rule.actionTemplate.type,
        description: rule.actionTemplate.description ?? null,
        defaultDueOffsetDays: rule.actionTemplate.defaultDueOffsetDays,
      },
      offsetDays: rule.offsetDays,
      schedule: rule.schedule,
      everyNDays: rule.everyNDays ?? null,
      occurrencesLimit: rule.occurrencesLimit ?? null,
    }));
  }

  private async upsertGeneratedTaskAndReminder(params: {
    user: User;
    planting: Planting;
    rule: VegetableActionRule;
    dueAt: Date;
    cycleIndex: number;
    forceOverrideManual: boolean;
    em: EntityManager;
  }) {
    const existing = await params.em.findOne(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceRefId: params.rule.id,
      dueAt: params.dueAt,
      cycleIndex: params.cycleIndex,
    });

    if (existing) {
      if (existing.status === ActionTaskStatus.DONE) {
        return;
      }

      if (existing.isManuallyRescheduled && !params.forceOverrideManual) {
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
    task.sourceRefId = params.rule.id;
    task.cycleIndex = params.cycleIndex;
    task.dueAt = params.dueAt;
    task.originalDueAt = params.dueAt;
    task.isManuallyRescheduled = false;
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
    const desiredKeys = new Set(
      params.desired.map(
        (item) =>
          `${item.ruleId}|${item.dueAt.toISOString()}|${item.cycleIndex}`,
      ),
    );

    const generated = await params.em.find(
      ActionTask,
      {
        user: params.user.id,
        source: ActionTaskSource.VEGETABLE_RULE,
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
      if (task.isManuallyRescheduled && !params.forceOverrideManual) {
        continue;
      }

      const key = `${task.sourceRefId ?? ''}|${task.dueAt?.toISOString() ?? ''}|${task.cycleIndex}`;
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
    switch (rule.trigger) {
      case ActionRuleTrigger.ON_SOWED:
        return planting.sowedAt
          ? normalizeDueAt(planting.sowedAt, planting.timelineTimezone)
          : null;
      case ActionRuleTrigger.AFTER_SOWING_DAYS:
        return planting.sowedAt
          ? normalizeDueAt(
              addDays(planting.sowedAt, rule.offsetDays),
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
      cycle += 1;
      cursor = normalizeDueAt(addDays(cursor, step), planting.timelineTimezone);
    }

    return occurrences;
  }
}
