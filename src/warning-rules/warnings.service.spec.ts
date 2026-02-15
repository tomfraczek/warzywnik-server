import { EntityManager } from '@mikro-orm/postgresql';
import { WarningsService } from './warnings.service';
import { WarningCode } from '../common/enums/warning.enums';

describe('WarningsService', () => {
  it('returns null when rule is missing in DB', async () => {
    const em = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager;

    const service = new WarningsService(em);

    const result = await service.buildWarning(WarningCode.DEPTH_TOO_SMALL, {
      bedDepthCm: 10,
      requiredDepthCm: 20,
    });

    expect(result).toBeNull();
  });
});
