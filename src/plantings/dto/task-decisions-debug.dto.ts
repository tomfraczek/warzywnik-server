import { PlantingStatus } from '../../common/enums/planting.enums';

type DebugDecisionType = string;

export type TaskDecisionsDebugDto = {
  plantingId: string;
  vegetable: string;
  status: PlantingStatus;
  context: {
    weatherSummary: {
      hasRainRecently?: boolean;
      rainForecastNext24h?: boolean;
      temperatureLevel?: 'low' | 'medium' | 'high';
      droughtRisk?: boolean;
    };
    soil: {
      waterRetention: string;
      drainage: string;
      fertilityLevel: string;
    };
    recentActions: Array<{
      decisionType: DebugDecisionType;
      completedAt: Date;
    }>;
    pendingTasks: Array<{
      decisionType: DebugDecisionType;
      dueAt: Date;
    }>;
    canceledTasks: Array<{
      decisionType: DebugDecisionType;
      canceledAt: Date;
    }>;
    activeWarnings: Array<{
      code: string;
      severity: string;
    }>;
  };
  routine: {
    candidates: Array<{
      ruleId: string;
      trigger: string;
      schedule: string;
      dueAt: Date | null;
      accepted: boolean;
      rejectReason?: string;
    }>;
  };
  decisions: {
    evaluators: Array<{
      evaluator: string;
      decisionType: string;
      result: 'CREATED' | 'SKIPPED';
      reason: string;
      details?: Record<string, unknown>;
    }>;
  };
  weather: {
    warnings: Array<{
      code: string;
      result: 'CREATED' | 'SKIPPED';
      reason: string;
      taskTitle?: string;
      decisionType?: string;
      details?: Record<string, unknown>;
    }>;
  };
  final: {
    createdTasks: Array<{
      decisionType: string;
      title: string;
      dueAt: Date;
      source: 'VEGETABLE_RULE' | 'WEATHER_WARNING' | 'DECISION_ENGINE';
      origin: 'ROUTINE_RULE' | 'WEATHER_WARNING' | 'DECISION_ENGINE';
      ruleId?: string;
      actionTemplateSlug?: string;
      trigger?: string;
      schedule?: string;
      evaluator?: string;
      reason?: string;
      warningCode?: string;
    }>;
    skippedDecisions: Array<{
      decisionType: string;
      reason: string;
      origin: 'ROUTINE_RULE' | 'WEATHER_WARNING' | 'DECISION_ENGINE';
      evaluator?: string;
    }>;
    conflicts?: Array<{
      decisionType: string;
      createdOrigins: Array<
        'ROUTINE_RULE' | 'WEATHER_WARNING' | 'DECISION_ENGINE'
      >;
      skippedOrigins: Array<
        'ROUTINE_RULE' | 'WEATHER_WARNING' | 'DECISION_ENGINE'
      >;
      note: string;
    }>;
  };
};
