export enum ReminderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  DONE = 'done',
  SKIPPED = 'skipped',
  CANCELED = 'canceled',
}

export enum ReminderType {
  DISEASE_CHECK = 'DISEASE_CHECK',
  DISEASE_TREATMENT = 'DISEASE_TREATMENT',
  PEST_CHECK = 'PEST_CHECK',
  ACTION_TASK_DUE = 'ACTION_TASK_DUE',
}

export enum ReminderAction {
  CHECK = 'check',
  TREAT = 'treat',
}
