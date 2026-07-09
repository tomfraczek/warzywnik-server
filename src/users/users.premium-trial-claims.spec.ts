import { createHash } from 'crypto';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PremiumTrialClaim } from './premium-trial-claim.entity';
import { User } from './user.entity';
import { PREMIUM_TRIAL_DAYS, UsersService } from './users.service';

type PersistedUser = User & { id: string };
type PersistedClaim = PremiumTrialClaim & { id: string };

function makeService() {
  const users: PersistedUser[] = [];
  const claims: PersistedClaim[] = [];
  let nextClaimId = 1;

  const fakeEm: {
    findOne: jest.Mock;
    persist: jest.Mock;
    persistAndFlush: jest.Mock;
    removeAndFlush: jest.Mock;
    nativeDelete: jest.Mock;
    flush: jest.Mock;
    transactional: jest.Mock;
  } = {
    findOne: jest.fn(
      async (
        entity: typeof User | typeof PremiumTrialClaim,
        query: Partial<User & PremiumTrialClaim>,
      ) => {
        if (entity === User) {
          if (query.clerkUserId) {
            return (
              users.find((user) => user.clerkUserId === query.clerkUserId) ??
              null
            );
          }

          if (query.id) {
            return users.find((user) => user.id === query.id) ?? null;
          }
        }

        if (entity === PremiumTrialClaim && query.emailHash) {
          return (
            claims.find((claim) => claim.emailHash === query.emailHash) ?? null
          );
        }

        return null;
      },
    ),
    persist: jest.fn((entity: unknown) => {
      if (entity instanceof PremiumTrialClaim && !claims.includes(entity)) {
        entity.id = `claim-${nextClaimId++}`;
        claims.push(entity as PersistedClaim);
      }
    }),
    persistAndFlush: jest.fn(async (entity: unknown) => {
      if (entity instanceof User && !users.includes(entity as PersistedUser)) {
        users.push(entity as PersistedUser);
      }
    }),
    removeAndFlush: jest.fn(async (entity: unknown) => {
      if (entity instanceof User) {
        const index = users.indexOf(entity as PersistedUser);
        if (index >= 0) {
          users.splice(index, 1);
        }
      }
    }),
    nativeDelete: jest.fn(async () => 1),
    flush: jest.fn(async () => undefined),
    transactional: jest.fn(async (fn: (em: typeof fakeEm) => Promise<User>) =>
      fn(fakeEm),
    ),
  };

  const fakeEvents = { emitLocationUpdated: jest.fn() };
  const service = new (UsersService as unknown as new (
    em: typeof fakeEm,
    events: typeof fakeEvents,
  ) => UsersService)(fakeEm, fakeEvents);

  return { service, fakeEm, users, claims };
}

describe('UsersService premium trial claims', () => {
  const originalPepper = process.env.TRIAL_EMAIL_HASH_PEPPER;
  const originalClerkSecretKey = process.env.CLERK_SECRET_KEY;

  beforeEach(() => {
    process.env.TRIAL_EMAIL_HASH_PEPPER = 'test-pepper';
    delete process.env.CLERK_SECRET_KEY;
    jest.useFakeTimers();
  });

  afterEach(() => {
    process.env.TRIAL_EMAIL_HASH_PEPPER = originalPepper;
    process.env.CLERK_SECRET_KEY = originalClerkSecretKey;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('gives a new email a 7-day trial', async () => {
    jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    const { service, claims } = makeService();

    const user = await service.getOrCreateFromClerkSub({
      clerkUserId: 'clerk-1',
      email: 'new@example.com',
    });

    expect(user.trialStartedAt).toEqual(new Date('2026-01-01T10:00:00.000Z'));
    expect(user.trialEndsAt).toEqual(new Date('2026-01-08T10:00:00.000Z'));
    expect(claims).toHaveLength(1);
    expect(claims[0].trialStartedAt).toEqual(user.trialStartedAt);
    expect(claims[0].trialEndsAt).toEqual(user.trialEndsAt);
    expect(
      claims[0].trialEndsAt.getTime() - claims[0].trialStartedAt.getTime(),
    ).toBe(PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  });

  it('re-registration with the same email gets the same trialEndsAt', async () => {
    jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    const { service, users, claims } = makeService();

    const firstUser = await service.getOrCreateFromClerkSub({
      clerkUserId: 'clerk-1',
      email: 'Same@Example.com',
    });
    const firstTrialEndsAt = firstUser.trialEndsAt;
    users.splice(0, users.length);

    jest.setSystemTime(new Date('2026-01-03T10:00:00.000Z'));
    const secondUser = await service.getOrCreateFromClerkSub({
      clerkUserId: 'clerk-2',
      email: ' same@example.com ',
    });

    expect(secondUser.trialStartedAt).toEqual(firstUser.trialStartedAt);
    expect(secondUser.trialEndsAt).toEqual(firstTrialEndsAt);
    expect(claims).toHaveLength(1);
    expect(claims[0].lastUserId).toBe(secondUser.id);
    expect(claims[0].lastClerkUserId).toBe('clerk-2');
  });

  it('re-registration after an expired trial resolves to Free', async () => {
    jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    const { service, users } = makeService();

    await service.getOrCreateFromClerkSub({
      clerkUserId: 'clerk-1',
      email: 'expired@example.com',
    });
    users.splice(0, users.length);

    jest.setSystemTime(new Date('2026-01-10T10:00:00.000Z'));
    const secondUser = await service.getOrCreateFromClerkSub({
      clerkUserId: 'clerk-2',
      email: 'expired@example.com',
    });

    const entitlements = new EntitlementsService();

    expect(secondUser.trialEndsAt).toEqual(
      new Date('2026-01-08T10:00:00.000Z'),
    );
    expect(
      entitlements.resolveSource(
        secondUser,
        new Date('2026-01-10T10:00:00.000Z'),
      ),
    ).toBe('free');
  });

  it('does not delete premium_trial_claims when deleting a user', async () => {
    jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    const { service, users, claims } = makeService();

    const user = await service.getOrCreateFromClerkSub({
      clerkUserId: 'clerk-1',
      email: 'delete@example.com',
    });

    await service.deleteMe(user.id);

    expect(users).toHaveLength(0);
    expect(claims).toHaveLength(1);
    expect(claims[0].lastUserId).toBe(user.id);
  });

  it('stores only a peppered email hash, not the plain email', async () => {
    jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    const { service, claims } = makeService();

    await service.getOrCreateFromClerkSub({
      clerkUserId: 'clerk-1',
      email: ' Plain.Email@Example.com ',
    });

    const expectedHash = createHash('sha256')
      .update('test-pepper:plain.email@example.com', 'utf8')
      .digest('hex');

    expect(claims[0].emailHash).toBe(expectedHash);
    expect(claims[0].emailHash).toHaveLength(64);
    expect(claims[0].emailHash).not.toContain('plain.email@example.com');
    expect(JSON.stringify(claims[0])).not.toContain('Plain.Email@Example.com');
  });
});
