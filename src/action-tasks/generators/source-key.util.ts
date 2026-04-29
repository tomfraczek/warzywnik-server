export const buildAutomationSourceKey = (params: {
  plantingId: string;
  templateId: string;
  trigger: string;
  dueAt: Date;
}) => {
  const day = params.dueAt.toISOString().slice(0, 10);
  return `${params.plantingId}:${params.templateId}:${params.trigger}:${day}`;
};
