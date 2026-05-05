import { ActionTask } from '../action-task.entity';
import { Planting } from '../../plantings/planting.entity';
import { PlantingEvent } from '../../planting-insights/planting-event.entity';
import { WarningInstance } from '../../weather/warnings/warning-instance.entity';
import { WeatherSnapshot } from '../../weather/weather-snapshot.entity';

export type DecisionType =
  | 'WATERING'
  | 'MOISTURE_CHECK'
  | 'PEST_CHECK'
  | 'DISEASE_CHECK'
  | 'WEEDING'
  | 'FERTILIZATION'
  | 'HARVEST_CHECK'
  | 'FROST_PROTECTION'
  | 'GENERAL_MONITORING';

export type DecisionConfidence = 'low' | 'medium' | 'high';

export type DecisionPriority = 'low' | 'medium' | 'high' | 'critical';

export type DecisionTargetType = 'planting' | 'bed' | 'space' | 'user';

export type DecisionCandidate = {
  decisionType: DecisionType;
  targetType: DecisionTargetType;
  plantingId?: string;
  bedId?: string;
  priority: DecisionPriority;
  dueAt: Date;
  reason: string;
  confidence: DecisionConfidence;
  sourceKey: string;
  actionTemplateSlug: string;
  shouldCreateTask: boolean;
};

export type PlantingDecisionContext = {
  now: Date;
  planting: Planting;
  latestWeatherSnapshot?: WeatherSnapshot | null;
  activeWarnings: WarningInstance[];
  pendingTasks: ActionTask[];
  recentlyCanceledTasks: ActionTask[];
  recentCompletedActionEvents: PlantingEvent[];
  recentPrecipMm24h: number;
  recentPrecipMm72h: number;
  forecastPrecipMm24h: number;
  forecastPrecipMm48h: number;
  forecastMaxTemp24h: number | null;
};
