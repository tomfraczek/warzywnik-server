export enum ContactMessageCategory {
  APP_PROBLEM = 'app_problem',
  FEATURE_REQUEST = 'feature_request',
  CONTENT_ERROR = 'content_error',
  NOTIFICATIONS_PROBLEM = 'notifications_problem',
  PREMIUM_PAYMENTS = 'premium_payments',
  QUESTION = 'question',
  OTHER = 'other',
}

export const CONTACT_MESSAGE_CATEGORY_LABELS: Record<
  ContactMessageCategory,
  string
> = {
  [ContactMessageCategory.APP_PROBLEM]: '🌱 Problem z aplikacją',
  [ContactMessageCategory.FEATURE_REQUEST]: '💡 Propozycja nowej funkcji',
  [ContactMessageCategory.CONTENT_ERROR]: '🥕 Błąd w treści',
  [ContactMessageCategory.NOTIFICATIONS_PROBLEM]:
    '📅 Problem z powiadomieniami',
  [ContactMessageCategory.PREMIUM_PAYMENTS]: '💳 Premium i płatności',
  [ContactMessageCategory.QUESTION]: '❓ Pytanie',
  [ContactMessageCategory.OTHER]: '📩 Inne',
};
