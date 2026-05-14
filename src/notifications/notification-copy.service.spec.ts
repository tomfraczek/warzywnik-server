import { NotificationCopyService } from './notification-copy.service';

describe('NotificationCopyService', () => {
  const service = new NotificationCopyService();

  it('returns user-friendly copy for SOWING_PAUSE garden risk', () => {
    const copy = service.buildGardenRiskChangedCopy('SOWING_PAUSE');

    expect(copy.title).toBe('Wstrzymaj siew');
    expect(copy.body).toContain('Dzisiejsze warunki');
    expect(copy.body).not.toContain('SOWING_PAUSE');
  });

  it('does not leak technical warning code in generic garden risk body', () => {
    const copy = service.buildGardenRiskChangedCopy('FROST_RISK');

    expect(copy.title).toBe('Ryzyko przymrozku');
    expect(copy.body).not.toContain('FROST_RISK');
  });

  it('does not leak technical lifecycle suggestion code', () => {
    const copy = service.buildLifecycleSuggestionCopy('HARVEST_WINDOW_START');

    expect(copy.title).toBe('Możesz rozpocząć zbiory');
    expect(copy.body).not.toContain('HARVEST_WINDOW_START');
  });
});
