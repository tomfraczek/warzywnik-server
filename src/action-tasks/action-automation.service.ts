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
  ActionTemplateAggregationScope,
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
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { PlantingLifecycleTaskGenerator } from './generators/planting-lifecycle-task.generator';
import { RoutineCareTaskGenerator } from './generators/routine-care-task.generator';
import { PostHarvestPromptGenerator } from './generators/post-harvest-prompt.generator';
import { GeneratedTaskCandidate } from './generators/task-generation.types';
import { Vegetable } from '../vegetables/vegetable.entity';
import { GardenDecisionEngine } from './decision-engine/garden-decision-engine.service';
import { PlantingDecisionContextBuilder } from './decision-engine/planting-decision-context-builder.service';
import { DecisionToTaskMapper } from './decision-engine/decision-to-task.mapper';
import {
  DecisionCandidate,
  DecisionEvaluationTrace,
  DecisionType,
  PlantingDecisionContext,
} from './decision-engine/decision.types';
import { mapActionTemplateTypeToDecisionType } from './decision-engine/decision-kind.util';
import { TaskDecisionsDebugDto } from '../plantings/dto/task-decisions-debug.dto';
import { WarningCode } from '../common/enums/warning.enums';
import {
  getLocalDate,
  localDatePlusDays,
} from '../weather/warnings/weather-warning.types';
import { hasCompletedDecisionToday } from './decision-engine/decision-context.helpers';

type DesiredOccurrence = {
  sourceKey: string;
  ruleId?: string;
  templateId?: string;
  actionTemplateSlug?: string;
  decisionType?: DecisionType;
  reason?: string;
  confidence?: 'low' | 'medium' | 'high';
  sourceMode: 'ROUTINE_RULE' | 'DECISION_ENGINE';
  aggregationScope: ActionTemplateAggregationScope;
  plantingIds: string[];
  vegetableNames: string[];
  cycleIndex: number;
  dueAt: Date;
};

type AggregationGroupDebug = {
  scope: ActionTemplateAggregationScope;
  groupKey: string;
  sourceKeys: string[];
  sourceMode: 'ROUTINE_RULE' | 'DECISION_ENGINE';
  decisionType: string;
  templateId?: string;
  dueDate: string;
  result: 'AGGREGATED' | 'SKIPPED';
  reason: string;
  aggregatedSourceKey?: string;
  candidateCount: number;
  affectedPlantingIds: string[];
};

const MAX_ACTIVE_TASKS_PER_PLANTING = 6;
const MAX_NEW_TASKS_PER_WEEK = 3;
const HARD_MIN_RULES_PER_START_METHOD = 1;
const SOFT_TARGET_RULES_PER_START_METHOD = 2;
const OPERATIONAL_WARNING_CODES = new Set<WarningCode>([
  WarningCode.FROST_RISK_TODAY_NIGHT,
  WarningCode.FROST_RISK_TOMORROW_NIGHT,
  WarningCode.HARD_FROST_RISK_TODAY_NIGHT,
  WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT,
  WarningCode.HEAVY_RAIN_TODAY_DAY,
  WarningCode.HEAVY_RAIN_TODAY_NIGHT,
  WarningCode.HEAVY_RAIN_TOMORROW_DAY,
  WarningCode.HEAVY_RAIN_TOMORROW_NIGHT,
  WarningCode.WIND_DAMAGE_TODAY_DAY,
  WarningCode.WIND_DAMAGE_TODAY_NIGHT,
  WarningCode.WIND_DAMAGE_TOMORROW_DAY,
  WarningCode.WIND_DAMAGE_TOMORROW_NIGHT,
  WarningCode.WATERING_NEEDED_TODAY,
  WarningCode.WATERING_NEEDED_TOMORROW,
  WarningCode.SOWING_PAUSE_TOO_COLD_TODAY,
  WarningCode.SOWING_PAUSE_TOO_COLD_TOMORROW,
  WarningCode.GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT,
  WarningCode.GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT,
  WarningCode.OVERWATERING_PREPARE_TODAY,
  WarningCode.OVERWATERING_PREPARE_TOMORROW,
  WarningCode.OVERWATERING_CHECK_TODAY,
  WarningCode.OVERWATERING_CHECK_TOMORROW,
  WarningCode.GREENHOUSE_FROST_RISK_TODAY_NIGHT,
  WarningCode.GREENHOUSE_FROST_RISK_TOMORROW_NIGHT,
  WarningCode.GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT,
  WarningCode.GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT,
  WarningCode.GREENHOUSE_HEAT_WAVE_TODAY_DAY,
  WarningCode.GREENHOUSE_HEAT_WAVE_TOMORROW_DAY,
  WarningCode.GREENHOUSE_STRONG_WIND_TODAY_DAY,
  WarningCode.GREENHOUSE_STRONG_WIND_TOMORROW_DAY,
  WarningCode.GREENHOUSE_STORM_TODAY_DAY,
  WarningCode.GREENHOUSE_STORM_TOMORROW_DAY,
  WarningCode.GREENHOUSE_HEAVY_RAIN_TODAY_DAY,
  WarningCode.GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY,
  WarningCode.GREENHOUSE_SNOW_LOAD_TODAY,
  WarningCode.GREENHOUSE_SNOW_LOAD_TOMORROW,
  WarningCode.GREENHOUSE_WET_SNOW_TODAY,
  WarningCode.GREENHOUSE_WET_SNOW_TOMORROW,
  WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TODAY,
  WarningCode.GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW,
]);

@Injectable()
export class ActionAutomationService {
  private readonly logger = new Logger(ActionAutomationService.name);
  private readonly lifecycleGenerator = new PlantingLifecycleTaskGenerator();
  private readonly routineGenerator = new RoutineCareTaskGenerator();
  private readonly postHarvestPromptGenerator =
    new PostHarvestPromptGenerator();
  private readonly decisionEngine: GardenDecisionEngine =
    new GardenDecisionEngine();
  private readonly decisionContextBuilder =
    new PlantingDecisionContextBuilder();
  private readonly decisionToTaskMapper = new DecisionToTaskMapper();

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
        {
          populate: [
            'bed',
            'bed.growingSpace',
            'bed.soil',
            'vegetable',
            'vegetable.commonPests',
            'vegetable.commonDiseases',
          ],
        },
      );

      if (!planting) {
        throw new NotFoundException('Planting not found');
      }

      if (params.user.automaticTasksEnabled === false) {
        this.logger.log(
          `skip recompute for planting=${params.plantingId} reason=${params.reason} automaticTasksEnabled=false`,
        );

        return {
          plantingId: planting.id,
          reason: params.reason,
          desiredCount: 0,
          skipped: true,
          automaticTasksEnabled: false,
        };
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
        planting.status === PlantingStatus.NEW ||
        planting.status === PlantingStatus.FAILED ||
        planting.status === PlantingStatus.CANCELLED ||
        planting.status === PlantingStatus.HARVESTED ||
        planting.status === PlantingStatus.CLEARED
      ) {
        await this.resetGeneratedTasksForPlanting({
          user: params.user,
          planting,
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

      await this.resetGeneratedTasksForPlanting({
        user: params.user,
        planting,
        em,
      });

      const desiredRoutine: DesiredOccurrence[] = floodFiltered.accepted.map(
        (candidate) => ({
          sourceKey: candidate.sourceKey,
          ruleId: candidate.rule.id,
          templateId: candidate.rule.actionTemplate.id,
          actionTemplateSlug:
            typeof (candidate.rule.actionTemplate as { slug?: string }).slug ===
            'string'
              ? (candidate.rule.actionTemplate as { slug?: string }).slug
              : undefined,
          decisionType:
            this.resolveDecisionTypeFromTemplate(candidate.rule) ?? undefined,
          sourceMode: 'ROUTINE_RULE',
          aggregationScope:
            candidate.rule.actionTemplate.aggregationScope ??
            ActionTemplateAggregationScope.NONE,
          plantingIds: [planting.id],
          vegetableNames: [planting.vegetable.name],
          cycleIndex: candidate.cycleIndex,
          dueAt: candidate.dueAt,
        }),
      );

      const decisionEvaluation = await this.buildDecisionEvaluation({
        em,
        planting,
      });
      const decisionCandidates = decisionEvaluation.candidates;
      const shouldBlockRoutineWatering = decisionEvaluation.traces.some(
        (trace) =>
          trace.decisionType === 'WATERING' &&
          trace.result === 'SKIPPED' &&
          this.isWateringBlockedReason(trace.reason),
      );

      const guardedRoutine = shouldBlockRoutineWatering
        ? desiredRoutine.filter((item) => item.decisionType !== 'WATERING')
        : desiredRoutine;

      const dedupedRoutine = guardedRoutine.filter((item) => {
        if (!item.decisionType) {
          return true;
        }

        return !hasCompletedDecisionToday(
          decisionEvaluation.context,
          item.decisionType,
        );
      });

      const routineDecisionTypes = new Set(
        dedupedRoutine
          .map((item) => item.decisionType)
          .filter((value): value is DecisionType => Boolean(value)),
      );

      const desiredDecisions: DesiredOccurrence[] = [];
      const allTemplates = await em.find(ActionTemplate, {});
      const decisionTemplatesById = new Map<string, ActionTemplate>();

      for (const candidate of decisionCandidates) {
        if (routineDecisionTypes.has(candidate.decisionType)) {
          continue;
        }

        const mappedTemplate = this.decisionToTaskMapper.pickTemplate(
          candidate,
          allTemplates,
        );

        if (mappedTemplate) {
          decisionTemplatesById.set(mappedTemplate.id, mappedTemplate);
        }

        desiredDecisions.push({
          sourceKey: candidate.sourceKey,
          templateId: mappedTemplate?.id,
          actionTemplateSlug:
            mappedTemplate?.slug ?? candidate.actionTemplateSlug,
          decisionType: candidate.decisionType,
          reason: candidate.reason,
          confidence: candidate.confidence,
          sourceMode: 'DECISION_ENGINE',
          aggregationScope:
            mappedTemplate?.aggregationScope ??
            ActionTemplateAggregationScope.NONE,
          plantingIds: [planting.id],
          vegetableNames: [planting.vegetable.name],
          cycleIndex: 0,
          dueAt: candidate.dueAt,
        });
      }

      const desiredBeforeAggregation: DesiredOccurrence[] = [
        ...dedupedRoutine,
        ...desiredDecisions,
      ];

      const templatesById = new Map<string, ActionTemplate>();
      for (const rule of rules) {
        templatesById.set(rule.actionTemplate.id, rule.actionTemplate);
      }
      for (const [templateId, template] of decisionTemplatesById.entries()) {
        templatesById.set(templateId, template);
      }

      const aggregationResult = this.aggregateDesiredOccurrences({
        user: params.user,
        planting,
        desired: desiredBeforeAggregation,
        templatesById,
      });

      const desired: DesiredOccurrence[] = aggregationResult.desired;

      for (const occurrence of desired) {
        if (
          occurrence.aggregationScope !== ActionTemplateAggregationScope.NONE &&
          occurrence.templateId
        ) {
          const template = templatesById.get(occurrence.templateId);
          if (template) {
            await this.upsertAggregatedGeneratedTaskAndReminder({
              user: params.user,
              planting,
              template,
              decisionType: occurrence.decisionType ?? null,
              dueAt: occurrence.dueAt,
              sourceKey: occurrence.sourceKey,
              sourceMode: occurrence.sourceMode,
              aggregationScope: occurrence.aggregationScope,
              plantingIds: occurrence.plantingIds,
              vegetableNames: occurrence.vegetableNames,
              forceOverrideManual: Boolean(params.forceOverrideManual),
              em,
            });
            continue;
          }
        }

        if (occurrence.ruleId) {
          const rule = rulesById.get(occurrence.ruleId);
          if (!rule) continue;

          await this.upsertGeneratedTaskAndReminder({
            user: params.user,
            planting,
            rule,
            dueAt: occurrence.dueAt,
            cycleIndex: occurrence.cycleIndex,
            sourceKey: occurrence.sourceKey,
            decisionType:
              occurrence.decisionType ??
              this.resolveDecisionTypeFromTemplate(rule),
            forceOverrideManual: Boolean(params.forceOverrideManual),
            em,
          });
          continue;
        }

        if (!occurrence.decisionType) {
          continue;
        }

        await this.upsertDecisionTaskAndReminder({
          user: params.user,
          planting,
          decisionType: occurrence.decisionType,
          dueAt: occurrence.dueAt,
          sourceKey: occurrence.sourceKey,
          reason: occurrence.reason ?? 'Context-based operational decision',
          confidence: occurrence.confidence ?? 'medium',
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

  async debugTaskDecisionsForPlanting(params: {
    user: User;
    plantingId: string;
    verbose?: boolean;
  }): Promise<TaskDecisionsDebugDto> {
    const planting = await this.em.findOne(
      Planting,
      { id: params.plantingId, user: params.user.id },
      {
        populate: [
          'bed',
          'bed.growingSpace',
          'bed.soil',
          'vegetable',
          'vegetable.commonPests',
          'vegetable.commonDiseases',
        ],
      },
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
      user: params.user,
      planting,
      candidates,
    });

    const acceptedKeys = new Set(
      floodFiltered.accepted.map((candidate) => candidate.sourceKey),
    );
    const skippedByKey = new Map(
      floodFiltered.skipped.map((item) => [item.sourceKey, item.reason]),
    );

    const today = toDateOnlyInTimezone(new Date(), planting.timelineTimezone);

    const routineCandidates = rules.map((rule) => {
      const baseDueAt = this.resolveRuleBaseDueAt(planting, rule);
      if (!baseDueAt) {
        return {
          ruleId: rule.id,
          trigger: rule.trigger,
          schedule: rule.schedule,
          dueAt: null,
          accepted: false,
          rejectReason: 'lifecycle mismatch: missing base date for trigger',
        };
      }

      const occurrences = this.buildOccurrences(planting, rule, baseDueAt, {
        routineOnly: true,
      });

      const todayOccurrence = occurrences.find(
        (occurrence) =>
          toDateOnlyInTimezone(
            occurrence.dueAt,
            planting.timelineTimezone,
          ).getTime() === today.getTime(),
      );

      if (!todayOccurrence) {
        return {
          ruleId: rule.id,
          trigger: rule.trigger,
          schedule: rule.schedule,
          dueAt: occurrences[0]?.dueAt ?? baseDueAt,
          accepted: false,
          rejectReason: 'outside today window',
        };
      }

      const candidate = candidates.find(
        (item) =>
          item.rule.id === rule.id &&
          item.cycleIndex === todayOccurrence.cycleIndex &&
          item.dueAt.getTime() === todayOccurrence.dueAt.getTime(),
      );

      if (!candidate) {
        return {
          ruleId: rule.id,
          trigger: rule.trigger,
          schedule: rule.schedule,
          dueAt: todayOccurrence.dueAt,
          accepted: false,
          rejectReason: 'rejected by routine candidate filtering',
        };
      }

      if (acceptedKeys.has(candidate.sourceKey)) {
        return {
          ruleId: rule.id,
          trigger: rule.trigger,
          schedule: rule.schedule,
          dueAt: todayOccurrence.dueAt,
          accepted: true,
        };
      }

      return {
        ruleId: rule.id,
        trigger: rule.trigger,
        schedule: rule.schedule,
        dueAt: todayOccurrence.dueAt,
        accepted: false,
        rejectReason:
          skippedByKey.get(candidate.sourceKey) ??
          'skipped: anti-flood/duplicate limit reached',
      };
    });

    const desiredRoutineForAggregation: DesiredOccurrence[] =
      floodFiltered.accepted.map((candidate) => ({
        sourceKey: candidate.sourceKey,
        ruleId: candidate.rule.id,
        templateId: candidate.rule.actionTemplate.id,
        actionTemplateSlug:
          typeof (candidate.rule.actionTemplate as { slug?: string }).slug ===
          'string'
            ? (candidate.rule.actionTemplate as { slug?: string }).slug
            : undefined,
        decisionType:
          this.resolveDecisionTypeFromTemplate(candidate.rule) ?? undefined,
        sourceMode: 'ROUTINE_RULE',
        aggregationScope:
          candidate.rule.actionTemplate.aggregationScope ??
          ActionTemplateAggregationScope.NONE,
        plantingIds: [planting.id],
        vegetableNames: [planting.vegetable.name],
        cycleIndex: candidate.cycleIndex,
        dueAt: candidate.dueAt,
      }));

    const aggregationDebug = this.aggregateDesiredOccurrences({
      user: params.user,
      planting,
      desired: desiredRoutineForAggregation,
      templatesById: new Map(
        rules.map((rule) => [rule.actionTemplate.id, rule.actionTemplate]),
      ),
    }).debugGroups;

    const decisionContext = await this.decisionContextBuilder.build({
      em: this.em,
      planting,
    });

    const decisionTraces = this.decisionEngine.evaluateWithTrace(
      decisionContext,
      Boolean(params.verbose),
    );

    const weatherDebug: TaskDecisionsDebugDto['weather']['warnings'] =
      this.debugWeatherWarnings(decisionContext, Boolean(params.verbose));

    const createdTasks: TaskDecisionsDebugDto['final']['createdTasks'] = [];
    const skippedDecisionEngineTypes = new Set(
      decisionTraces
        .filter((trace) => trace.result === 'SKIPPED')
        .map((trace) => trace.decisionType),
    );

    for (const item of routineCandidates) {
      if (!item.accepted || !item.dueAt) continue;
      const rule = rules.find((ruleItem) => ruleItem.id === item.ruleId);
      if (!rule) continue;

      const actionTemplateSlug =
        typeof (rule.actionTemplate as { slug?: string }).slug === 'string'
          ? (rule.actionTemplate as { slug?: string }).slug
          : undefined;

      createdTasks.push({
        decisionType:
          this.resolveDecisionTypeFromTemplate(rule) ?? 'GENERAL_MONITORING',
        title: rule.actionTemplate.name,
        dueAt: item.dueAt,
        source: 'VEGETABLE_RULE',
        origin: 'ROUTINE_RULE',
        ruleId: rule.id,
        actionTemplateSlug,
        trigger: rule.trigger,
        schedule: rule.schedule,
        reason: 'created: accepted routine rule candidate',
      });
    }

    for (const trace of decisionTraces) {
      if (trace.result !== 'CREATED' || !trace.candidate) continue;
      if (skippedDecisionEngineTypes.has(trace.candidate.decisionType)) {
        continue;
      }

      createdTasks.push({
        decisionType: trace.candidate.decisionType,
        title: trace.candidate.actionTemplateSlug,
        dueAt: trace.candidate.dueAt,
        source: 'DECISION_ENGINE',
        origin: 'DECISION_ENGINE',
        evaluator: trace.evaluator,
        reason: trace.reason,
      });
    }

    for (const warning of weatherDebug) {
      if (warning.result !== 'CREATED' || !warning.taskTitle) continue;
      createdTasks.push({
        decisionType: warning.decisionType ?? 'GENERAL_MONITORING',
        title: warning.taskTitle,
        dueAt:
          warning.details?.dueAt instanceof Date
            ? warning.details.dueAt
            : new Date(),
        source: 'WEATHER_WARNING',
        origin: 'WEATHER_WARNING',
        reason: warning.reason,
        warningCode: warning.code,
      });
    }

    const skippedDecisions: TaskDecisionsDebugDto['final']['skippedDecisions'] =
      [
        ...routineCandidates
          .filter((item) => !item.accepted)
          .map((item) => {
            const matchedRule = rules.find((rule) => rule.id === item.ruleId);
            return {
              decisionType:
                (matchedRule
                  ? this.resolveDecisionTypeFromTemplate(matchedRule)
                  : null) ?? 'GENERAL_MONITORING',
              reason: item.rejectReason ?? 'skipped',
              origin: 'ROUTINE_RULE' as const,
              evaluator: 'RoutineCareTaskGenerator',
            };
          }),
        ...decisionTraces
          .filter((trace) => trace.result === 'SKIPPED')
          .map((trace) => ({
            decisionType: trace.decisionType,
            reason: trace.reason,
            origin: 'DECISION_ENGINE' as const,
            evaluator: trace.evaluator,
          })),
        ...weatherDebug
          .filter((item) => item.result === 'SKIPPED')
          .map((item) => ({
            decisionType: item.decisionType ?? 'GENERAL_MONITORING',
            reason: item.reason,
            origin: 'WEATHER_WARNING' as const,
            evaluator: 'WeatherTaskPlannerService',
          })),
      ];

    const createdOriginsByDecisionType = new Map<
      string,
      Set<'ROUTINE_RULE' | 'DECISION_ENGINE' | 'WEATHER_WARNING'>
    >();
    for (const created of createdTasks) {
      const bucket =
        createdOriginsByDecisionType.get(created.decisionType) ??
        new Set<'ROUTINE_RULE' | 'DECISION_ENGINE' | 'WEATHER_WARNING'>();
      bucket.add(created.origin);
      createdOriginsByDecisionType.set(created.decisionType, bucket);
    }

    const skippedOriginsByDecisionType = new Map<
      string,
      Set<'ROUTINE_RULE' | 'DECISION_ENGINE' | 'WEATHER_WARNING'>
    >();
    for (const skipped of skippedDecisions) {
      const bucket =
        skippedOriginsByDecisionType.get(skipped.decisionType) ??
        new Set<'ROUTINE_RULE' | 'DECISION_ENGINE' | 'WEATHER_WARNING'>();
      bucket.add(skipped.origin);
      skippedOriginsByDecisionType.set(skipped.decisionType, bucket);
    }

    const conflicts: NonNullable<TaskDecisionsDebugDto['final']['conflicts']> =
      [];
    for (const [
      decisionType,
      createdOriginsSet,
    ] of createdOriginsByDecisionType) {
      const skippedOriginsSet = skippedOriginsByDecisionType.get(decisionType);
      if (!skippedOriginsSet || skippedOriginsSet.size === 0) {
        continue;
      }

      conflicts.push({
        decisionType,
        createdOrigins: Array.from(createdOriginsSet.values()),
        skippedOrigins: Array.from(skippedOriginsSet.values()),
        note: 'same decisionType appears in created and skipped from different origins',
      });
    }

    const resolveTaskDecisionType = (task: ActionTask) => {
      const fromMetadata = task.metadata?.decisionType;
      if (typeof fromMetadata === 'string') {
        return fromMetadata;
      }
      return mapActionTemplateTypeToDecisionType(task.actionTemplate?.type);
    };

    const resolveEventDecisionType = (
      eventPayload: Record<string, unknown>,
    ) => {
      const decisionType = eventPayload.decisionType;
      if (typeof decisionType === 'string') {
        return decisionType;
      }
      const actionType = eventPayload.actionType;
      if (typeof actionType === 'string') {
        return mapActionTemplateTypeToDecisionType(actionType);
      }
      return 'GENERAL_MONITORING';
    };

    const hasRainRecently = decisionContext.recentPrecipMm24h >= 2;
    const rainForecastNext24h = decisionContext.forecastPrecipMm24h >= 2;
    const temperatureLevel =
      (decisionContext.forecastMaxTemp24h ?? 0) >= 30
        ? 'high'
        : (decisionContext.forecastMaxTemp24h ?? 0) >= 20
          ? 'medium'
          : 'low';
    const droughtRisk = decisionContext.activeWarnings.some(
      (warning) =>
        warning.code === WarningCode.DROUGHT_RISK_NEXT_7_DAYS ||
        warning.code === WarningCode.WATERING_NEEDED_TODAY ||
        warning.code === WarningCode.WATERING_NEEDED_TOMORROW,
    );

    return {
      plantingId: planting.id,
      vegetable: planting.vegetable.name,
      status: planting.status,
      context: {
        weatherSummary: {
          hasRainRecently,
          rainForecastNext24h,
          temperatureLevel,
          droughtRisk,
        },
        soil: {
          waterRetention: planting.bed.soil?.waterRetention ?? 'unknown',
          drainage: planting.bed.soil?.drainage ?? 'unknown',
          fertilityLevel: planting.bed.soil?.fertilityLevel ?? 'unknown',
        },
        recentActions: decisionContext.recentCompletedActionEvents.map(
          (event) => ({
            decisionType:
              resolveEventDecisionType(event.payload) ?? 'GENERAL_MONITORING',
            completedAt: event.eventTime,
          }),
        ),
        pendingTasks: decisionContext.pendingTasks.map((task) => ({
          decisionType: resolveTaskDecisionType(task) ?? 'GENERAL_MONITORING',
          dueAt: task.dueAt ?? new Date(),
        })),
        canceledTasks: decisionContext.recentlyCanceledTasks.map((task) => ({
          decisionType: resolveTaskDecisionType(task) ?? 'GENERAL_MONITORING',
          canceledAt: task.updatedAt,
        })),
        activeWarnings: decisionContext.activeWarnings.map((warning) => ({
          code: warning.code,
          severity:
            typeof warning.details?.severity === 'string'
              ? warning.details.severity
              : 'unknown',
        })),
      },
      routine: {
        candidates: routineCandidates,
      },
      decisions: {
        evaluators: decisionTraces.map((trace) => ({
          evaluator: trace.evaluator,
          decisionType: trace.decisionType,
          result: trace.result,
          reason: trace.reason,
          details: params.verbose ? trace.details : undefined,
        })),
      },
      weather: {
        warnings: weatherDebug,
      },
      aggregation: {
        groups: aggregationDebug,
      },
      final: {
        createdTasks,
        skippedDecisions,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      },
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
    const vegetables = await this.em.find(Vegetable, {});
    const enabledRules = await this.em.find(
      VegetableActionRule,
      { isEnabled: true },
      { populate: ['vegetable'] },
    );

    const rulesByVegetableId = new Map<string, VegetableActionRule[]>();
    for (const rule of enabledRules) {
      const vegetableId = rule.vegetable.id;
      const bucket = rulesByVegetableId.get(vegetableId) ?? [];
      bucket.push(rule);
      rulesByVegetableId.set(vegetableId, bucket);
    }

    const startMethods = [
      PlantingStartMethod.DIRECT_SOW,
      PlantingStartMethod.TRANSPLANT,
    ] as const;

    const coverageByVegetable = vegetables.map((vegetable) => {
      const vegetableRules = rulesByVegetableId.get(vegetable.id) ?? [];

      const perStartMethod = startMethods.map((startMethod) => {
        const applicableRules = vegetableRules.filter((rule) => {
          if (rule.trigger === ActionRuleTrigger.ON_HARVEST_CONFIRMED) {
            return false;
          }

          if (
            rule.applyIfStartMethod &&
            rule.applyIfStartMethod.length > 0 &&
            !rule.applyIfStartMethod.includes(startMethod)
          ) {
            return false;
          }

          return true;
        });

        const count = applicableRules.length;
        const status =
          count < HARD_MIN_RULES_PER_START_METHOD
            ? 'below_hard'
            : count < SOFT_TARGET_RULES_PER_START_METHOD
              ? 'meets_hard_only'
              : 'meets_soft';

        return {
          startMethod,
          enabledApplicableRules: count,
          status,
        };
      });

      const worstStatus = perStartMethod.some(
        (entry) => entry.status === 'below_hard',
      )
        ? 'below_hard'
        : perStartMethod.some((entry) => entry.status === 'meets_hard_only')
          ? 'meets_hard_only'
          : 'meets_soft';

      return {
        vegetableId: vegetable.id,
        vegetableName: vegetable.name,
        perStartMethod,
        status: worstStatus,
      };
    });

    const totalPairs = coverageByVegetable.length * startMethods.length;
    const pairsMeetingHard = coverageByVegetable.reduce(
      (acc, vegetable) =>
        acc +
        vegetable.perStartMethod.filter(
          (entry) => entry.status !== 'below_hard',
        ).length,
      0,
    );
    const pairsMeetingSoft = coverageByVegetable.reduce(
      (acc, vegetable) =>
        acc +
        vegetable.perStartMethod.filter(
          (entry) => entry.status === 'meets_soft',
        ).length,
      0,
    );

    const hardMinimumCoverageRatio =
      totalPairs > 0 ? pairsMeetingHard / totalPairs : 1;
    const softTargetCoverageRatio =
      totalPairs > 0 ? pairsMeetingSoft / totalPairs : 1;

    const status =
      hardMinimumCoverageRatio < 1
        ? 'below_hard'
        : softTargetCoverageRatio < 1
          ? 'meets_hard_only'
          : 'meets_soft';

    return {
      templatesTotal: templates.length,
      enabledRulesTotal: rules,
      byGenerationMode,
      coverage: {
        hardMinimumRulesPerStartMethod: HARD_MIN_RULES_PER_START_METHOD,
        softTargetRulesPerStartMethod: SOFT_TARGET_RULES_PER_START_METHOD,
        totalVegetables: vegetables.length,
        totalMethodPairs: totalPairs,
        pairsMeetingHardMinimum: pairsMeetingHard,
        pairsMeetingSoftTarget: pairsMeetingSoft,
        hardMinimumCoverageRatio,
        softTargetCoverageRatio,
        status,
        byVegetable: coverageByVegetable,
      },
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
    decisionType: DecisionType | null;
    forceOverrideManual: boolean;
    em: EntityManager;
  }) {
    const existingBySourceKey = await params.em.findOne(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceKey: params.sourceKey,
    });

    const existingByUniqueSlot = await params.em.findOne(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceRefId: params.rule.id,
      dueAt: params.dueAt,
      cycleIndex: params.cycleIndex,
    });

    const existing = existingBySourceKey ?? existingByUniqueSlot;

    if (existing) {
      if (existing.sourceType !== ActionTaskSourceType.AUTOMATION) {
        return;
      }

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

      existing.status = ActionTaskStatus.PENDING;
      existing.suppressedAt = null;
      existing.sourceType = ActionTaskSourceType.AUTOMATION;
      existing.sourceRefId = params.rule.id;
      existing.sourceKey = params.sourceKey;
      existing.dedupeKey = params.sourceKey;
      existing.cycleIndex = params.cycleIndex;
      existing.dueAt = params.dueAt;
      existing.originalDueAt = params.dueAt;
      existing.generatedAt = new Date();
      existing.title = params.rule.actionTemplate.name;
      existing.description = params.rule.actionTemplate.description ?? null;
      existing.metadata = {
        ...(existing.metadata ?? {}),
        decisionType: params.decisionType,
        actionKind: params.decisionType,
        sourceKey: params.sourceKey,
        sourceMode: 'ROUTINE_RULE',
      };

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
    task.metadata = {
      ...(task.metadata ?? {}),
      decisionType: params.decisionType,
      actionKind: params.decisionType,
      sourceKey: params.sourceKey,
      sourceMode: 'ROUTINE_RULE',
    };

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

  private aggregateDesiredOccurrences(params: {
    user: User;
    planting: Planting;
    desired: DesiredOccurrence[];
    templatesById: Map<string, ActionTemplate>;
  }): {
    desired: DesiredOccurrence[];
    debugGroups: AggregationGroupDebug[];
  } {
    const passthrough: DesiredOccurrence[] = [];
    const aggregatableGroups = new Map<string, DesiredOccurrence[]>();
    const debugGroups: AggregationGroupDebug[] = [];

    for (const occurrence of params.desired) {
      if (!occurrence.templateId) {
        passthrough.push(occurrence);
        continue;
      }

      const template = params.templatesById.get(occurrence.templateId);
      if (!template) {
        passthrough.push(occurrence);
        continue;
      }

      const scope =
        template.aggregationScope ?? ActionTemplateAggregationScope.NONE;

      if (scope === ActionTemplateAggregationScope.NONE) {
        debugGroups.push({
          scope,
          groupKey: occurrence.sourceKey,
          sourceKeys: [occurrence.sourceKey],
          sourceMode: occurrence.sourceMode,
          decisionType: occurrence.decisionType ?? 'GENERAL_MONITORING',
          templateId: template.id,
          dueDate: occurrence.dueAt.toISOString().slice(0, 10),
          result: 'SKIPPED',
          reason: 'aggregation disabled on template',
          candidateCount: 1,
          affectedPlantingIds: occurrence.plantingIds,
        });
        passthrough.push(occurrence);
        continue;
      }

      if (template.requiresUserConfirmation) {
        debugGroups.push({
          scope,
          groupKey: occurrence.sourceKey,
          sourceKeys: [occurrence.sourceKey],
          sourceMode: occurrence.sourceMode,
          decisionType: occurrence.decisionType ?? 'GENERAL_MONITORING',
          templateId: template.id,
          dueDate: occurrence.dueAt.toISOString().slice(0, 10),
          result: 'SKIPPED',
          reason: 'requiresUserConfirmation=true is not aggregated',
          candidateCount: 1,
          affectedPlantingIds: occurrence.plantingIds,
        });
        passthrough.push(occurrence);
        continue;
      }

      const dateOnly = occurrence.dueAt.toISOString().slice(0, 10);
      const decisionType = occurrence.decisionType ?? 'GENERAL_MONITORING';
      const origin = occurrence.sourceMode;
      const source = ActionTaskSource.VEGETABLE_RULE;

      if (scope === ActionTemplateAggregationScope.BED) {
        const bedId = params.planting.bed.id;
        const groupKey = [
          params.user.id,
          bedId,
          dateOnly,
          template.id,
          decisionType,
          source,
          origin,
          'AGGREGATE_BED_GROUP',
        ].join(':');
        const existing = aggregatableGroups.get(groupKey) ?? [];
        existing.push({
          ...occurrence,
          aggregationScope: ActionTemplateAggregationScope.BED,
        });
        aggregatableGroups.set(groupKey, existing);
        continue;
      }

      if (scope === ActionTemplateAggregationScope.SPACE) {
        const growingSpaceId = params.planting.bed.growingSpace.id;
        const groupKey = [
          params.user.id,
          growingSpaceId,
          dateOnly,
          template.id,
          decisionType,
          source,
          origin,
          'AGGREGATE_SPACE_GROUP',
        ].join(':');
        const existing = aggregatableGroups.get(groupKey) ?? [];
        existing.push({
          ...occurrence,
          aggregationScope: ActionTemplateAggregationScope.SPACE,
        });
        aggregatableGroups.set(groupKey, existing);
        continue;
      }

      const groupKey = [
        params.user.id,
        dateOnly,
        template.id,
        decisionType,
        source,
        origin,
        'AGGREGATE_USER_GROUP',
      ].join(':');
      const existing = aggregatableGroups.get(groupKey) ?? [];
      existing.push({
        ...occurrence,
        aggregationScope: ActionTemplateAggregationScope.USER,
      });
      aggregatableGroups.set(groupKey, existing);
    }

    const aggregated: DesiredOccurrence[] = [];

    for (const [groupKey, group] of aggregatableGroups.entries()) {
      const first = group[0];
      if (!first) continue;
      const dateOnly = first.dueAt.toISOString().slice(0, 10);
      const decisionType = first.decisionType ?? 'GENERAL_MONITORING';
      const templateId = first.templateId;
      const sourceMode = first.sourceMode;

      if (!templateId) {
        passthrough.push(...group);
        continue;
      }

      let aggregatedSourceKey = first.sourceKey;
      if (first.aggregationScope === ActionTemplateAggregationScope.BED) {
        aggregatedSourceKey = [
          params.user.id,
          params.planting.bed.id,
          dateOnly,
          templateId,
          decisionType,
          sourceMode,
          'AGGREGATED_BED',
        ].join(':');
      } else if (
        first.aggregationScope === ActionTemplateAggregationScope.SPACE
      ) {
        aggregatedSourceKey = [
          params.user.id,
          params.planting.bed.growingSpace.id,
          dateOnly,
          templateId,
          decisionType,
          sourceMode,
          'AGGREGATED_SPACE',
        ].join(':');
      } else if (
        first.aggregationScope === ActionTemplateAggregationScope.USER
      ) {
        aggregatedSourceKey = [
          params.user.id,
          dateOnly,
          templateId,
          decisionType,
          sourceMode,
          'AGGREGATED_USER',
        ].join(':');
      }

      const plantingIds = Array.from(
        new Set(group.flatMap((item) => item.plantingIds)),
      );
      const vegetableNames = Array.from(
        new Set(group.flatMap((item) => item.vegetableNames)),
      );

      aggregated.push({
        ...first,
        sourceKey: aggregatedSourceKey,
        aggregationScope: first.aggregationScope,
        plantingIds,
        vegetableNames,
        cycleIndex: 0,
      });

      debugGroups.push({
        scope: first.aggregationScope,
        groupKey,
        sourceKeys: group.map((item) => item.sourceKey),
        sourceMode,
        decisionType,
        templateId,
        dueDate: dateOnly,
        result: 'AGGREGATED',
        reason:
          group.length > 1
            ? `aggregated ${group.length} candidates into one task`
            : 'single candidate normalized as aggregated scope',
        aggregatedSourceKey,
        candidateCount: group.length,
        affectedPlantingIds: plantingIds,
      });
    }

    return {
      desired: [...passthrough, ...aggregated],
      debugGroups,
    };
  }

  private async upsertAggregatedGeneratedTaskAndReminder(params: {
    user: User;
    planting: Planting;
    template: ActionTemplate;
    decisionType: DecisionType | null;
    dueAt: Date;
    sourceKey: string;
    sourceMode: 'ROUTINE_RULE' | 'DECISION_ENGINE';
    aggregationScope: ActionTemplateAggregationScope;
    plantingIds: string[];
    vegetableNames: string[];
    forceOverrideManual: boolean;
    em: EntityManager;
  }) {
    const existing = await params.em.findOne(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceKey: params.sourceKey,
    });

    if (existing) {
      if (existing.sourceType !== ActionTaskSourceType.AUTOMATION) {
        return;
      }

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

      const metadata = existing.metadata ?? {};
      const existingPlantingIds = Array.isArray(metadata.affectedPlantingIds)
        ? metadata.affectedPlantingIds.filter(
            (item): item is string => typeof item === 'string',
          )
        : [];
      const existingVegetables = Array.isArray(metadata.affectedVegetables)
        ? metadata.affectedVegetables.filter(
            (item): item is string => typeof item === 'string',
          )
        : [];

      const affectedPlantingIds = Array.from(
        new Set([...existingPlantingIds, ...params.plantingIds]),
      );
      const affectedVegetables = Array.from(
        new Set([...existingVegetables, ...params.vegetableNames]),
      );

      existing.status = ActionTaskStatus.PENDING;
      existing.sourceType = ActionTaskSourceType.AUTOMATION;
      existing.sourceRefId = null;
      existing.sourceKey = params.sourceKey;
      existing.dedupeKey = params.sourceKey;
      existing.cycleIndex = 0;
      existing.dueAt = params.dueAt;
      existing.originalDueAt = params.dueAt;
      existing.generatedAt = new Date();
      existing.actionTemplate = params.template;
      existing.title = params.template.name;
      existing.description = params.template.description ?? null;
      existing.targetType =
        params.aggregationScope === ActionTemplateAggregationScope.BED
          ? ActionTaskTargetType.BED
          : params.aggregationScope === ActionTemplateAggregationScope.SPACE
            ? ActionTaskTargetType.SPACE
            : ActionTaskTargetType.USER;
      existing.planting = null;
      existing.bed =
        params.aggregationScope === ActionTemplateAggregationScope.BED
          ? params.planting.bed
          : null;
      existing.growingSpace =
        params.aggregationScope === ActionTemplateAggregationScope.SPACE
          ? params.planting.bed.growingSpace
          : null;
      existing.metadata = {
        ...metadata,
        decisionType: params.decisionType,
        actionKind: params.decisionType,
        sourceKey: params.sourceKey,
        sourceMode: params.sourceMode,
        aggregationScope: params.aggregationScope,
        affectedPlantingIds,
        affectedVegetables,
        originPlantingTaskCount: affectedPlantingIds.length,
      };

      await this.upsertReminderForTask(params.em, existing, params.template);
      return;
    }

    const task = new ActionTask();
    task.user = params.user;
    task.actionTemplate = params.template;
    task.title = params.template.name;
    task.description = params.template.description ?? null;
    task.status = ActionTaskStatus.PENDING;
    task.source = ActionTaskSource.VEGETABLE_RULE;
    task.sourceType = ActionTaskSourceType.AUTOMATION;
    task.sourceRefId = null;
    task.sourceKey = params.sourceKey;
    task.dedupeKey = params.sourceKey;
    task.cycleIndex = 0;
    task.dueAt = params.dueAt;
    task.originalDueAt = params.dueAt;
    task.isManuallyRescheduled = false;
    task.isUserModified = false;
    task.suppressedAt = null;
    task.generatedAt = new Date();
    task.targetType =
      params.aggregationScope === ActionTemplateAggregationScope.BED
        ? ActionTaskTargetType.BED
        : params.aggregationScope === ActionTemplateAggregationScope.SPACE
          ? ActionTaskTargetType.SPACE
          : ActionTaskTargetType.USER;
    task.planting = null;
    task.bed =
      params.aggregationScope === ActionTemplateAggregationScope.BED
        ? params.planting.bed
        : null;
    task.growingSpace =
      params.aggregationScope === ActionTemplateAggregationScope.SPACE
        ? params.planting.bed.growingSpace
        : null;
    task.metadata = {
      decisionType: params.decisionType,
      actionKind: params.decisionType,
      sourceKey: params.sourceKey,
      sourceMode: params.sourceMode,
      aggregationScope: params.aggregationScope,
      affectedPlantingIds: Array.from(new Set(params.plantingIds)),
      affectedVegetables: Array.from(new Set(params.vegetableNames)),
      originPlantingTaskCount: Array.from(new Set(params.plantingIds)).length,
    };

    params.em.persist(task);
    await params.em.flush();

    await this.upsertReminderForTask(params.em, task, params.template);
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
    const plantingSourceKeyPrefix = `${params.planting.id}:`;

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
      if (
        !this.isCleanupCandidateOwnedByPlanting(
          task,
          params.planting.id,
          plantingSourceKeyPrefix,
        )
      ) {
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

  private async resetGeneratedTasksForPlanting(params: {
    user: User;
    planting: Planting;
    em: EntityManager;
  }) {
    const plantingSourceKeyPrefix = `${params.planting.id}:`;

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
      if (
        !this.isCleanupCandidateOwnedByPlanting(
          task,
          params.planting.id,
          plantingSourceKeyPrefix,
        )
      ) {
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

  private isCleanupCandidateOwnedByPlanting(
    task: ActionTask,
    plantingId: string,
    sourceKeyPrefix: string,
  ) {
    if (task.sourceKey && task.sourceKey.startsWith(sourceKeyPrefix)) {
      return true;
    }

    if (task.planting?.id === plantingId) {
      return true;
    }

    return false;
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

    const todayInTz = toDateOnlyInTimezone(
      new Date(),
      planting.timelineTimezone,
    );

    return [...lifecycleCandidates, ...routineCandidates]
      .filter(
        (candidate) =>
          toDateOnlyInTimezone(
            candidate.dueAt,
            planting.timelineTimezone,
          ).getTime() === todayInTz.getTime(),
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
      status: ActionTaskStatus.PENDING,
      ...plantingScope,
    });

    const weekStart = this.startOfCurrentWeek();
    let newTasksThisWeek = await params.em.count(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
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

  private async buildDecisionCandidates(params: {
    em: EntityManager;
    planting: Planting;
  }) {
    const evaluation = await this.buildDecisionEvaluation(params);
    const candidates = evaluation.candidates;
    const dateKey = normalizeDueAt(new Date(), params.planting.timelineTimezone)
      .toISOString()
      .slice(0, 10);

    return candidates.map((candidate) => ({
      ...candidate,
      sourceKey: `${params.planting.id}:${candidate.sourceKey}:${dateKey}`,
    }));
  }

  private async buildDecisionEvaluation(params: {
    em: EntityManager;
    planting: Planting;
  }): Promise<{
    context: PlantingDecisionContext;
    traces: DecisionEvaluationTrace[];
    candidates: DecisionCandidate[];
  }> {
    const context = await this.decisionContextBuilder.build({
      em: params.em,
      planting: params.planting,
    });

    const traces = this.decisionEngine.evaluateWithTrace(context, false);
    const candidates: DecisionCandidate[] = [];
    for (const trace of traces) {
      if (trace.result === 'CREATED' && trace.candidate) {
        candidates.push(trace.candidate);
      }
    }

    return { context, traces, candidates };
  }

  private isWateringBlockedReason(reason: string) {
    const normalized = reason.toLowerCase();
    return (
      normalized.includes('forecast rain') ||
      normalized.includes('recent rain') ||
      normalized.includes('no watering signal')
    );
  }

  private async upsertDecisionTaskAndReminder(params: {
    user: User;
    planting: Planting;
    decisionType: DecisionType;
    dueAt: Date;
    sourceKey: string;
    reason: string;
    confidence: 'low' | 'medium' | 'high';
    forceOverrideManual: boolean;
    em: EntityManager;
  }) {
    const existing = await params.em.findOne(ActionTask, {
      user: params.user.id,
      source: ActionTaskSource.VEGETABLE_RULE,
      sourceKey: params.sourceKey,
    });

    const templates = await params.em.find(ActionTemplate, {});
    const template = this.decisionToTaskMapper.pickTemplate(
      {
        decisionType: params.decisionType,
        targetType: 'planting',
        plantingId: params.planting.id,
        bedId: params.planting.bed.id,
        priority: 'medium',
        dueAt: params.dueAt,
        reason: params.reason,
        confidence: params.confidence,
        sourceKey: params.sourceKey,
        actionTemplateSlug: '',
        shouldCreateTask: true,
      },
      templates,
    );

    if (!template) {
      return;
    }

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

      existing.status = ActionTaskStatus.PENDING;
      existing.suppressedAt = null;
      existing.sourceType = ActionTaskSourceType.AUTOMATION;
      existing.sourceRefId = null;
      existing.sourceKey = params.sourceKey;
      existing.dedupeKey = params.sourceKey;
      existing.cycleIndex = 0;
      existing.dueAt = params.dueAt;
      existing.originalDueAt = params.dueAt;
      existing.generatedAt = new Date();
      existing.actionTemplate = template;
      existing.title = template.name;
      existing.description = template.description ?? params.reason;
      existing.metadata = {
        ...(existing.metadata ?? {}),
        decisionType: params.decisionType,
        actionKind: params.decisionType,
        sourceMode: 'DECISION_ENGINE',
        sourceKey: params.sourceKey,
        confidence: params.confidence,
        reason: params.reason,
      };

      await this.upsertReminderForTask(params.em, existing, template);
      return;
    }

    const task = new ActionTask();
    task.user = params.user;
    task.actionTemplate = template;
    task.title = template.name;
    task.description = template.description ?? params.reason;
    task.status = ActionTaskStatus.PENDING;
    task.source = ActionTaskSource.VEGETABLE_RULE;
    task.sourceType = ActionTaskSourceType.AUTOMATION;
    task.sourceRefId = null;
    task.sourceKey = params.sourceKey;
    task.dedupeKey = params.sourceKey;
    task.cycleIndex = 0;
    task.dueAt = params.dueAt;
    task.originalDueAt = params.dueAt;
    task.isManuallyRescheduled = false;
    task.isUserModified = false;
    task.suppressedAt = null;
    task.generatedAt = new Date();
    task.targetType = ActionTaskTargetType.PLANTING;
    task.planting = params.planting;
    task.bed = null;
    task.growingSpace = null;
    task.metadata = {
      decisionType: params.decisionType,
      actionKind: params.decisionType,
      sourceMode: 'DECISION_ENGINE',
      sourceKey: params.sourceKey,
      confidence: params.confidence,
      reason: params.reason,
    };

    params.em.persist(task);
    await params.em.flush();

    await this.upsertReminderForTask(params.em, task, template);
  }

  private resolveDecisionTypeFromTemplate(
    rule: VegetableActionRule,
  ): DecisionType | null {
    return mapActionTemplateTypeToDecisionType(rule.actionTemplate.type);
  }

  private debugWeatherWarnings(
    context: PlantingDecisionContext,
    verbose: boolean,
  ): TaskDecisionsDebugDto['weather']['warnings'] {
    const recentCompletedKeys = new Set(
      context.recentCompletedActionEvents
        .map((event) => {
          const decisionType = event.payload?.decisionType;
          if (typeof decisionType !== 'string') return null;
          return `${decisionType}:${event.planting.id}`;
        })
        .filter((value): value is string => Boolean(value)),
    );

    const recentCanceledKeys = new Set(
      context.recentlyCanceledTasks
        .map((task) => {
          const decisionType = task.metadata?.decisionType;
          if (typeof decisionType !== 'string') return null;
          const plantingId = task.planting?.id ?? 'none';
          const bedId = task.bed?.id ?? 'none';
          return `${decisionType}:${plantingId}:${bedId}`;
        })
        .filter((value): value is string => Boolean(value)),
    );

    const dedupedFingerprints = new Set<string>();
    const result: TaskDecisionsDebugDto['weather']['warnings'] = [];

    for (const warning of context.activeWarnings) {
      if (!OPERATIONAL_WARNING_CODES.has(warning.code)) {
        result.push({
          code: warning.code,
          result: 'SKIPPED',
          reason: 'skipped: warning code not operational for task planner',
        });
        continue;
      }

      const localDateRaw = warning.details?.localDate;
      const localDate =
        typeof localDateRaw === 'string'
          ? localDateRaw
          : warning.validFrom.toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
        result.push({
          code: warning.code,
          result: 'SKIPPED',
          reason: 'skipped: missing localDate on warning',
        });
        continue;
      }

      const timezone =
        typeof warning.details?.timezone === 'string' &&
        warning.details.timezone.length > 0
          ? warning.details.timezone
          : 'UTC';
      const today = getLocalDate(context.now, timezone);
      const tomorrow = localDatePlusDays(today, 1);
      if (localDate !== today && localDate !== tomorrow) {
        result.push({
          code: warning.code,
          result: 'SKIPPED',
          reason: 'skipped: outside today/tomorrow weather window',
        });
        continue;
      }

      const decisionType =
        warning.code === WarningCode.WATERING_NEEDED_TODAY ||
        warning.code === WarningCode.WATERING_NEEDED_TOMORROW
          ? 'WATERING'
          : warning.code ===
                WarningCode.GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT ||
              warning.code ===
                WarningCode.GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT ||
              warning.code === WarningCode.FROST_RISK_TODAY_NIGHT ||
              warning.code === WarningCode.FROST_RISK_TOMORROW_NIGHT ||
              warning.code === WarningCode.HARD_FROST_RISK_TODAY_NIGHT ||
              warning.code === WarningCode.HARD_FROST_RISK_TOMORROW_NIGHT
            ? 'FROST_PROTECTION'
            : warning.code === WarningCode.OVERWATERING_PREPARE_TODAY ||
                warning.code === WarningCode.OVERWATERING_PREPARE_TOMORROW ||
                warning.code === WarningCode.OVERWATERING_CHECK_TODAY ||
                warning.code === WarningCode.OVERWATERING_CHECK_TOMORROW
              ? 'MOISTURE_CHECK'
              : 'GENERAL_MONITORING';

      const plantingId = warning.planting?.id ?? context.planting.id;
      const bedId = warning.bed?.id ?? context.planting.bed.id;
      const completedKey = `${decisionType}:${plantingId}`;
      if (recentCompletedKeys.has(completedKey)) {
        result.push({
          code: warning.code,
          result: 'SKIPPED',
          decisionType,
          reason: 'skipped: similar action completed recently',
        });
        continue;
      }

      const canceledKey = `${decisionType}:${plantingId}:${bedId}`;
      if (recentCanceledKeys.has(canceledKey)) {
        result.push({
          code: warning.code,
          result: 'SKIPPED',
          decisionType,
          reason: 'skipped: similar weather task canceled recently',
        });
        continue;
      }

      const fingerprint = `${decisionType}:${plantingId}:${bedId}:${localDate}`;
      if (dedupedFingerprints.has(fingerprint)) {
        result.push({
          code: warning.code,
          result: 'SKIPPED',
          decisionType,
          reason: 'skipped: duplicate warning fingerprint',
        });
        continue;
      }
      dedupedFingerprints.add(fingerprint);

      const taskTitle =
        decisionType === 'WATERING'
          ? 'Podlej uprawy'
          : decisionType === 'MOISTURE_CHECK'
            ? 'Sprawdź zastoiska po opadach'
            : decisionType === 'FROST_PROTECTION'
              ? 'Osłoń rośliny przed przymrozkiem'
              : 'Operacyjne działanie pogodowe';

      result.push({
        code: warning.code,
        result: 'CREATED',
        reason: 'created: warning produced an operational weather task',
        taskTitle,
        decisionType,
        details: verbose
          ? {
              localDate,
              timezone,
              dueAt: warning.validFrom,
              plantingId,
              bedId,
            }
          : undefined,
      });
    }

    return result;
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
