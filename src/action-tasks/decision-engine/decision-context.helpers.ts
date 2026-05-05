import { ActionTask } from '../action-task.entity';
import { PlantingEvent } from '../../planting-insights/planting-event.entity';
import { PlantingEventType } from '../../common/enums/planting-event.enums';
import { DecisionType, PlantingDecisionContext } from './decision.types';
import { mapActionTemplateTypeToDecisionType } from './decision-kind.util';
import { toDateOnlyInTimezone } from '../../common/types/date-utils';

const DAY_MS = 24 * 60 * 60 * 1000;

const taskDecisionType = (task: ActionTask): DecisionType | null => {
  const metadataDecisionType = task.metadata?.decisionType;
  if (typeof metadataDecisionType === 'string') {
    return metadataDecisionType as DecisionType;
  }

  return mapActionTemplateTypeToDecisionType(task.actionTemplate?.type);
};

const eventDecisionType = (event: PlantingEvent): DecisionType | null => {
  const payloadDecisionType = event.payload?.decisionType;
  if (typeof payloadDecisionType === 'string') {
    return payloadDecisionType as DecisionType;
  }

  const actionType = event.payload?.actionType;
  if (typeof actionType === 'string') {
    return mapActionTemplateTypeToDecisionType(actionType);
  }

  return null;
};

export const hasPendingDecisionTask = (
  context: PlantingDecisionContext,
  decisionType: DecisionType,
): boolean =>
  context.pendingTasks.some(
    (task) =>
      task.planting?.id === context.planting.id &&
      taskDecisionType(task) === decisionType,
  );

export const hasRecentCanceledDecisionTask = (
  context: PlantingDecisionContext,
  decisionType: DecisionType,
  days: number,
): boolean => {
  const threshold = context.now.getTime() - days * DAY_MS;

  return context.recentlyCanceledTasks.some((task) => {
    if (task.planting?.id !== context.planting.id) return false;
    if (taskDecisionType(task) !== decisionType) return false;
    const canceledAt = task.updatedAt ?? task.suppressedAt ?? task.createdAt;
    return canceledAt.getTime() >= threshold;
  });
};

export const hasCompletedDecisionToday = (
  context: PlantingDecisionContext,
  decisionType: DecisionType,
): boolean => {
  const tz = context.planting.timelineTimezone;
  const today = toDateOnlyInTimezone(context.now, tz).getTime();

  return context.recentCompletedActionEvents.some((event) => {
    if (event.eventType !== PlantingEventType.PLANTING_ACTION_COMPLETED) {
      return false;
    }
    if (eventDecisionType(event) !== decisionType) {
      return false;
    }
    return toDateOnlyInTimezone(event.eventTime, tz).getTime() === today;
  });
};

export const hasCompletedDecisionYesterday = (
  context: PlantingDecisionContext,
  decisionType: DecisionType,
): boolean => {
  const tz = context.planting.timelineTimezone;
  const todayDate = toDateOnlyInTimezone(context.now, tz);
  const yesterday = new Date(todayDate.getTime() - DAY_MS).getTime();

  return context.recentCompletedActionEvents.some((event) => {
    if (event.eventType !== PlantingEventType.PLANTING_ACTION_COMPLETED) {
      return false;
    }
    if (eventDecisionType(event) !== decisionType) {
      return false;
    }
    return toDateOnlyInTimezone(event.eventTime, tz).getTime() === yesterday;
  });
};

export const lastCompletedDecisionAt = (
  context: PlantingDecisionContext,
  decisionType: DecisionType,
): Date | null => {
  const matches = context.recentCompletedActionEvents
    .filter(
      (event) =>
        event.eventType === PlantingEventType.PLANTING_ACTION_COMPLETED &&
        eventDecisionType(event) === decisionType,
    )
    .sort((a, b) => b.eventTime.getTime() - a.eventTime.getTime());

  return matches[0]?.eventTime ?? null;
};
