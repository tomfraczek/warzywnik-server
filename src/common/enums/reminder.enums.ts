export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DONE = 'done',
  SKIPPED = 'skipped',
  CANCELED = 'canceled',
}

export enum ReminderType {
  DISEASE_CHECK = 'DISEASE_CHECK',
  DISEASE_TREATMENT = 'DISEASE_TREATMENT',
}

export enum ReminderAction {
  CHECK = 'check',
  TREAT = 'treat',
}
