/**
 * Unit tests for UsersService.deleteMe()
 *
 * Verifies that deleting a user account:
 *  1. Removes the User entity (DB cascades handle all owned children)
 *  2. Explicitly removes the Location entity (no user_id FK, not cascaded)
 *  3. Works correctly when the user has no Location
 *  4. Is a no-op when the user does not exist
 */

import { UsersService } from './users.service';

type FakeUser = { id: string; location?: { id: string } | null };

function makeService(user: FakeUser | null) {
  const removed: unknown[] = [];
  const nativeDeleted: Array<{ query: Record<string, string> }> = [];

  const fakeEm = {
    findOne: jest.fn().mockResolvedValue(user),
    removeAndFlush: jest.fn().mockImplementation((entity: unknown) => {
      removed.push(entity);
      return Promise.resolve();
    }),
    nativeDelete: jest
      .fn()
      .mockImplementation((_entity: unknown, query: Record<string, string>) => {
        nativeDeleted.push({ query });
        return Promise.resolve(1);
      }),
    transactional: jest
      .fn()
      .mockImplementation(async (fn: (em: unknown) => Promise<void>) => {
        await fn(fakeEm);
      }),
  };

  const fakeEvents = { publishLocationUpdated: jest.fn() };

  const service = new (UsersService as unknown as new (
    em: typeof fakeEm,
    events: typeof fakeEvents,
  ) => UsersService)(fakeEm, fakeEvents);

  return { service, fakeEm, removed, nativeDeleted };
}

describe('UsersService.deleteMe()', () => {
  it('removes the user entity via removeAndFlush', async () => {
    const user: FakeUser = { id: 'user-1', location: null };
    const { service, removed } = makeService(user);

    await service.deleteMe('user-1');

    expect(removed).toContain(user);
  });

  it('explicitly deletes the user-owned Location', async () => {
    const user: FakeUser = { id: 'user-1', location: { id: 'loc-1' } };
    const { service, nativeDeleted } = makeService(user);

    await service.deleteMe('user-1');

    expect(nativeDeleted).toHaveLength(1);
    expect(nativeDeleted[0].query).toEqual({ id: 'loc-1' });
  });

  it('does not call nativeDelete when user has no location', async () => {
    const user: FakeUser = { id: 'user-1', location: null };
    const { service, nativeDeleted } = makeService(user);

    await service.deleteMe('user-1');

    expect(nativeDeleted).toHaveLength(0);
  });

  it('does not call nativeDelete when user.location is undefined', async () => {
    const user: FakeUser = { id: 'user-1' };
    const { service, nativeDeleted } = makeService(user);

    await service.deleteMe('user-1');

    expect(nativeDeleted).toHaveLength(0);
  });

  it('is a no-op when user does not exist', async () => {
    const { service, removed, nativeDeleted } = makeService(null);

    await service.deleteMe('non-existent');

    expect(removed).toHaveLength(0);
    expect(nativeDeleted).toHaveLength(0);
  });

  it('wraps everything in a single transaction', async () => {
    const user: FakeUser = { id: 'user-1', location: { id: 'loc-1' } };
    const { service, fakeEm } = makeService(user);

    await service.deleteMe('user-1');

    expect(fakeEm.transactional).toHaveBeenCalledTimes(1);
  });

  it('calls findOne with populate location', async () => {
    const user: FakeUser = { id: 'user-1', location: null };
    const { service, fakeEm } = makeService(user);

    await service.deleteMe('user-1');

    expect(fakeEm.findOne).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'user-1' },
      { populate: ['location'] },
    );
  });
});
