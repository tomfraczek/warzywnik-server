/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { EntityManager } from '@mikro-orm/postgresql';
import { ActionTemplateTarget } from '../common/enums/action.enums';
import { ActionTemplatesService } from './action-templates.service';

describe('ActionTemplatesService manual templates', () => {
  it('lists only user selectable templates and defaults target to bed/planting', async () => {
    const em = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'tpl-1',
          name: 'Dosadzanie roślin',
          slug: 'dosadzanie-roslin',
          description: null,
          target: ActionTemplateTarget.PLANTING,
          environment: 'any',
          type: 'transplanting',
          generationMode: 'MANUAL_ONLY',
          priority: 'medium',
          aggregationScope: 'none',
          maxAutoOccurrencesPerPlanting: null,
          minDaysBetweenOccurrences: null,
          requiresUserConfirmation: false,
          defaultDueOffsetDays: 0,
          isUserSelectable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    } as unknown as EntityManager;

    const service: ActionTemplatesService = new ActionTemplatesService(em);

    const result = await service.listManual({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('tpl-1');
    expect(result.items[0]?.isUserSelectable).toBe(true);

    expect((em.find as unknown as jest.Mock).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        isUserSelectable: true,
        target: {
          $in: [ActionTemplateTarget.BED, ActionTemplateTarget.PLANTING],
        },
      }),
    );
  });

  it('filters manual templates by target and query', async () => {
    const em = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager;

    const service: ActionTemplatesService = new ActionTemplatesService(em);

    await service.listManual({
      target: ActionTemplateTarget.BED,
      q: 'gleba',
    });

    expect((em.find as unknown as jest.Mock).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        isUserSelectable: true,
        target: ActionTemplateTarget.BED,
      }),
    );
    expect((em.find as unknown as jest.Mock).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        $or: [
          { name: { $ilike: '%gleba%' } },
          { description: { $ilike: '%gleba%' } },
        ],
      }),
    );
  });
});
