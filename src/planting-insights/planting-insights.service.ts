import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { PlantingEvent } from './planting-event.entity';
import { PlantingSeasonSummary } from './planting-season-summary.entity';
import { Planting } from '../plantings/planting.entity';
import { ActionTask } from '../action-tasks/action-task.entity';
import { PestOccurrence } from '../pest-occurrences/pest-occurrence.entity';
import { PlantingDisease } from '../planting-diseases/planting-disease.entity';
import { Bed } from '../beds/bed.entity';
import { User } from '../users/user.entity';
import { PlantingEventType } from '../common/enums/planting-event.enums';
import {
  ActionTaskStatus,
  ActionTemplateType,
} from '../common/enums/action.enums';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';

export type RecordEventParams = {
  plantingId: string;
  userId: string;
  bedId: string;
  vegetableId: string;
  eventType: PlantingEventType;
  eventTime: Date;
  payload: Record<string, unknown>;
};

const PROTECTION_TYPES = new Set<ActionTemplateType>([
  ActionTemplateType.PEST_CONTROL,
  ActionTemplateType.DISEASE_CONTROL,
  ActionTemplateType.SPRAYING,
  ActionTemplateType.PHYSICAL_PROTECTION,
  ActionTemplateType.TRAP_SETUP,
]);

@Injectable()
export class PlantingInsightsService {
  private readonly logger = new Logger(PlantingInsightsService.name);

  constructor(private readonly em: EntityManager) {}

  // -------------------------------------------------------------------------
  // Event recording
  // -------------------------------------------------------------------------

  async recordEvent(params: RecordEventParams): Promise<void> {
    try {
      const event = new PlantingEvent();
      event.planting = this.em.getReference(Planting, params.plantingId);
      event.userId = params.userId;
      event.bedId = params.bedId;
      event.vegetableId = params.vegetableId;
      event.eventType = params.eventType;
      event.eventTime = params.eventTime;
      event.payload = params.payload;

      await this.em.persistAndFlush(event);
    } catch (err) {
      this.logger.error(
        `Failed to record event ${params.eventType} for planting ${params.plantingId}: ${String(err)}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Season summary
  // -------------------------------------------------------------------------

  async buildSeasonSummary(plantingId: string): Promise<void> {
    try {
      const planting = await this.em.findOne(
        Planting,
        { id: plantingId },
        { populate: ['user', 'bed', 'vegetable'] },
      );

      if (!planting) return;

      const realStart = this.computeRealSeasonStart(planting);
      const realEnd = this.computeSeasonEnd(planting);

      const seasonDurationDays =
        realEnd != null
          ? Math.floor(
              (realEnd.getTime() - realStart.getTime()) / (1000 * 60 * 60 * 24),
            )
          : null;

      const doneTasks = await this.em.find(
        ActionTask,
        { planting: plantingId, status: ActionTaskStatus.DONE },
        { populate: ['actionTemplate'] },
      );

      let wateringCount = 0;
      let fertilizationCount = 0;
      let protectionCount = 0;

      for (const task of doneTasks) {
        const type = task.actionTemplate?.type;
        if (!type) continue;
        if (type === ActionTemplateType.WATERING) {
          wateringCount++;
        } else if (type === ActionTemplateType.FERTILIZATION) {
          fertilizationCount++;
        } else if (PROTECTION_TYPES.has(type)) {
          protectionCount++;
        }
      }

      const pestEvents = await this.em.count(PestOccurrence, {
        planting: plantingId,
      });
      const diseaseEvents = await this.em.count(PlantingDisease, {
        planting: plantingId,
      });

      const seasonYear = realStart.getFullYear();

      let summary = await this.em.findOne(PlantingSeasonSummary, {
        planting: plantingId,
      });

      if (!summary) {
        summary = new PlantingSeasonSummary();
        summary.planting = planting;
        summary.userId = planting.user.id;
        summary.bedId = planting.bed.id;
        summary.vegetableId = planting.vegetable.id;
      }

      summary.seasonYear = seasonYear;
      summary.realStartDate = realStart;
      summary.realEndDate = realEnd ?? null;
      summary.seasonDurationDays = seasonDurationDays;
      summary.tasksCompleted = doneTasks.length;
      summary.wateringCount = wateringCount;
      summary.fertilizationCount = fertilizationCount;
      summary.protectionCount = protectionCount;
      summary.pestEvents = pestEvents;
      summary.diseaseEvents = diseaseEvents;
      summary.yieldKg = planting.yieldKg ?? null;

      await this.em.persistAndFlush(summary);
    } catch (err) {
      this.logger.error(
        `Failed to build season summary for planting ${plantingId}: ${String(err)}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Read: timeline
  // -------------------------------------------------------------------------

  async getTimeline(user: User, plantingId: string) {
    const planting = await this.em.findOne(Planting, {
      id: plantingId,
      user: user.id,
    });

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    const [events, doneTasks, pestOccurrences, plantingDiseases] =
      await Promise.all([
        this.em.find(
          PlantingEvent,
          { planting: plantingId },
          { orderBy: { eventTime: 'asc' } },
        ),
        this.em.find(
          ActionTask,
          { planting: plantingId, status: ActionTaskStatus.DONE },
          { populate: ['actionTemplate'], orderBy: { doneAt: 'asc' } },
        ),
        this.em.find(
          PestOccurrence,
          { planting: plantingId },
          { populate: ['pest'], orderBy: { createdAt: 'asc' } },
        ),
        this.em.find(
          PlantingDisease,
          { planting: plantingId },
          { populate: ['disease'], orderBy: { observedAt: 'asc' } },
        ),
      ]);

    type TimelineItem = {
      time: Date;
      type: string;
      [key: string]: unknown;
    };

    const items: TimelineItem[] = [];
    const taskCompletionIdsFromEvents = new Set<string>();
    const pestOccurrenceIdsFromEvents = new Set<string>();
    const diseaseOccurrenceIdsFromEvents = new Set<string>();

    for (const e of events) {
      const actionKind =
        typeof e.payload?.actionKind === 'string' ? e.payload.actionKind : null;
      const scope =
        typeof e.payload?.scope === 'string' ? e.payload.scope : null;

      if (
        e.eventType === PlantingEventType.PLANTING_ACTION_COMPLETED &&
        actionKind === 'NOTE' &&
        scope === 'bed'
      ) {
        continue;
      }

      const occurrenceId =
        typeof e.payload?.occurrenceId === 'string'
          ? e.payload.occurrenceId
          : null;

      if (
        occurrenceId &&
        e.eventType === PlantingEventType.PEST_OCCURRENCE_ADDED
      ) {
        pestOccurrenceIdsFromEvents.add(occurrenceId);
      }

      if (
        occurrenceId &&
        e.eventType === PlantingEventType.DISEASE_OCCURRENCE_ADDED
      ) {
        diseaseOccurrenceIdsFromEvents.add(occurrenceId);
      }

      const taskId =
        typeof e.payload?.taskId === 'string' ? e.payload.taskId : null;
      const actionTitle =
        typeof e.payload?.actionTitle === 'string'
          ? e.payload.actionTitle
          : null;
      const actionType =
        typeof e.payload?.actionType === 'string' ? e.payload.actionType : null;
      const source =
        typeof e.payload?.source === 'string' ? e.payload.source : null;

      if (
        e.eventType === PlantingEventType.PLANTING_ACTION_COMPLETED &&
        taskId != null
      ) {
        taskCompletionIdsFromEvents.add(taskId);
        items.push({
          time: e.eventTime,
          type: 'ACTION_COMPLETED',
          eventType: e.eventType,
          taskId,
          title: actionTitle,
          actionType,
          source,
          label: actionTitle
            ? `Wykonano zabieg ${actionTitle}`
            : 'Wykonano zabieg',
          payload: e.payload,
        });
        continue;
      }

      items.push({
        time: e.eventTime,
        type: 'PLANTING_EVENT',
        eventType: e.eventType,
        payload: e.payload,
      });
    }

    for (const task of doneTasks) {
      if (!task.doneAt) continue;

      if (taskCompletionIdsFromEvents.has(task.id)) {
        continue;
      }

      items.push({
        time: task.doneAt,
        type: 'ACTION_COMPLETED',
        taskId: task.id,
        eventType: PlantingEventType.PLANTING_ACTION_COMPLETED,
        title: task.title,
        actionType: task.actionTemplate?.type ?? null,
        source: task.source,
        label: `Wykonano zabieg ${task.title}`,
      });
    }

    for (const occ of pestOccurrences) {
      if (pestOccurrenceIdsFromEvents.has(occ.id)) {
        continue;
      }

      items.push({
        time: occ.createdAt,
        type: 'PEST_OCCURRENCE',
        occurrenceId: occ.id,
        pestId: occ.pest.id,
        pestName: occ.pest.name,
        status: occ.status,
        notes: occ.notes ?? null,
      });
    }

    for (const dis of plantingDiseases) {
      if (diseaseOccurrenceIdsFromEvents.has(dis.id)) {
        continue;
      }

      items.push({
        time: dis.observedAt,
        type: 'DISEASE_OCCURRENCE',
        occurrenceId: dis.id,
        diseaseId: dis.disease.id,
        diseaseName: dis.disease.name,
        severity: dis.severity ?? null,
        status: dis.status,
        notes: dis.notes ?? null,
      });
    }

    items.sort((a, b) => a.time.getTime() - b.time.getTime());

    return { plantingId, items };
  }

  // -------------------------------------------------------------------------
  // Read: bed seasons
  // -------------------------------------------------------------------------

  async getBedSeasons(user: User, bedId: string) {
    const bed = await this.em.findOne(Bed, { id: bedId, user: user.id });

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    const summaries = await this.em.find(
      PlantingSeasonSummary,
      { bedId: bed.id, userId: user.id },
      {
        orderBy: { realStartDate: 'asc' },
        populate: ['planting'],
      },
    );

    return { items: summaries.map((s) => this.serializeSummary(s)) };
  }

  // -------------------------------------------------------------------------
  // Read: season comparison
  // -------------------------------------------------------------------------

  async getSeasonComparison(user: User, plantingId: string) {
    const planting = await this.em.findOne(
      Planting,
      { id: plantingId, user: user.id },
      { populate: ['vegetable'] },
    );

    if (!planting) {
      throw new NotFoundException('Planting not found');
    }

    const currentSummary = await this.em.findOne(PlantingSeasonSummary, {
      planting: plantingId,
      userId: user.id,
    });

    const previousSummaries = await this.em.find(
      PlantingSeasonSummary,
      {
        userId: user.id,
        vegetableId: planting.vegetable.id,
        planting: { $ne: plantingId },
      },
      {
        orderBy: { realStartDate: 'desc' },
        limit: 3,
        populate: ['planting'],
      },
    );

    return {
      current: currentSummary ? this.serializeSummary(currentSummary) : null,
      previous: previousSummaries.map((prev) => {
        const startDiffDays =
          currentSummary?.realStartDate != null && prev.realStartDate != null
            ? Math.floor(
                (currentSummary.realStartDate.getTime() -
                  prev.realStartDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : null;

        const durationDiffDays =
          currentSummary?.seasonDurationDays != null &&
          prev.seasonDurationDays != null
            ? currentSummary.seasonDurationDays - prev.seasonDurationDays
            : null;

        const yieldDiffKg =
          currentSummary?.yieldKg != null && prev.yieldKg != null
            ? Number(currentSummary.yieldKg) - Number(prev.yieldKg)
            : null;

        const taskCountDiff =
          currentSummary != null
            ? currentSummary.tasksCompleted - prev.tasksCompleted
            : null;

        return {
          ...this.serializeSummary(prev),
          startDiffDays,
          durationDiffDays,
          yieldDiffKg,
          taskCountDiff,
        };
      }),
    };
  }

  // -------------------------------------------------------------------------
  // Domain functions
  // -------------------------------------------------------------------------

  computeRealSeasonStart(planting: Planting): Date {
    if (planting.startMethod === PlantingStartMethod.DIRECT_SOW) {
      return (
        planting.sowedAt ??
        planting.actualStartDate ??
        planting.plannedStartDate
      );
    }
    return (
      planting.transplantedAt ??
      planting.actualStartDate ??
      planting.plannedStartDate
    );
  }

  computeSeasonEnd(planting: Planting): Date | null {
    if (planting.harvestedAt != null) return planting.harvestedAt;
    if (planting.status === PlantingStatus.CLEARED) return planting.updatedAt;
    return null;
  }

  // -------------------------------------------------------------------------
  // Serializers
  // -------------------------------------------------------------------------

  private serializeSummary(summary: PlantingSeasonSummary) {
    return {
      id: summary.id,
      plantingId: summary.planting.id,
      userId: summary.userId,
      bedId: summary.bedId,
      vegetableId: summary.vegetableId,
      seasonYear: summary.seasonYear,
      realStartDate: summary.realStartDate ?? null,
      realEndDate: summary.realEndDate ?? null,
      seasonDurationDays: summary.seasonDurationDays ?? null,
      tasksCompleted: summary.tasksCompleted,
      wateringCount: summary.wateringCount,
      fertilizationCount: summary.fertilizationCount,
      protectionCount: summary.protectionCount,
      pestEvents: summary.pestEvents,
      diseaseEvents: summary.diseaseEvents,
      yieldKg: summary.yieldKg != null ? Number(summary.yieldKg) : null,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };
  }
}
