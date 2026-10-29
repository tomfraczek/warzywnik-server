/**
 * Unit tests for UsersAdminService
 *
 * Verifies that admin user management:
 *  1. Applies patched fields and flushes
 *  2. Prevents an admin from blocking / demoting / deleting themselves
 *  3. Syncs the Clerk ban only when isActive actually changes
 *  4. Delegates deletion to UsersService.deleteMe()
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersAdminService } from './users-admin.service';
import { SubscriptionPlan } from '../common/enums/user.enums';

const banUser = jest.fn();
const unbanUser = jest.fn();

jest.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ users: { banUser, unbanUser } }),
}));

type FakeUser = {
  id: string;
  clerkUserId: string;
  isActive: boolean;
  isAdmin: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 'user-1',
    clerkUserId: 'clerk-1',
    isActive: true,
    isAdmin: false,
    subscriptionPlan: SubscriptionPlan.FREE,
    subscriptionExpiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeService(user: FakeUser | null) {
  const fakeEm = {
    findOne: jest.fn().mockResolvedValue(user),
    flush: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(0),
  };
  const fakeUsersService = { deleteMe: jest.fn().mockResolvedValue(undefined) };
  const fakeEntitlements = { resolveSource: jest.fn().mockReturnValue('free') };

  const service = new (UsersAdminService as unknown as new (
    em: typeof fakeEm,
    usersService: typeof fakeUsersService,
    entitlements: typeof fakeEntitlements,
  ) => UsersAdminService)(fakeEm, fakeUsersService, fakeEntitlements);

  return { service, fakeEm, fakeUsersService };
}

describe('UsersAdminService', () => {
  const originalSecret = process.env.CLERK_SECRET_KEY;

  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test';
    banUser.mockReset();
    unbanUser.mockReset();
  });

  afterAll(() => {
    process.env.CLERK_SECRET_KEY = originalSecret;
  });

  describe('update()', () => {
    it('applies patched fields and flushes', async () => {
      const user = makeUser();
      const { service, fakeEm } = makeService(user);
      const expiresAt = new Date('2027-01-01T00:00:00Z');

      const result = await service.update(
        'user-1',
        {
          isAdmin: true,
          subscriptionPlan: SubscriptionPlan.PREMIUM,
          subscriptionExpiresAt: expiresAt,
        },
        'admin-1',
      );

      expect(user.isAdmin).toBe(true);
      expect(user.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
      expect(user.subscriptionExpiresAt).toBe(expiresAt);
      expect(fakeEm.flush).toHaveBeenCalled();
      expect(result.stats).toEqual({
        beds: 0,
        plantings: 0,
        notes: 0,
        growingSpaces: 0,
        devices: 0,
      });
    });

    it('bans the Clerk user when blocking', async () => {
      const user = makeUser();
      const { service } = makeService(user);

      await service.update('user-1', { isActive: false }, 'admin-1');

      expect(user.isActive).toBe(false);
      expect(banUser).toHaveBeenCalledWith('clerk-1');
      expect(unbanUser).not.toHaveBeenCalled();
    });

    it('unbans the Clerk user when unblocking', async () => {
      const user = makeUser({ isActive: false });
      const { service } = makeService(user);

      await service.update('user-1', { isActive: true }, 'admin-1');

      expect(unbanUser).toHaveBeenCalledWith('clerk-1');
      expect(banUser).not.toHaveBeenCalled();
    });

    it('does not touch Clerk when isActive is unchanged', async () => {
      const { service } = makeService(makeUser());

      await service.update('user-1', { isActive: true }, 'admin-1');

      expect(banUser).not.toHaveBeenCalled();
      expect(unbanUser).not.toHaveBeenCalled();
    });

    it('rejects blocking your own account', async () => {
      const { service } = makeService(makeUser({ isAdmin: true }));

      await expect(
        service.update('user-1', { isActive: false }, 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects revoking your own admin rights', async () => {
      const { service } = makeService(makeUser({ isAdmin: true }));

      await expect(
        service.update('user-1', { isAdmin: false }, 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound for a missing user', async () => {
      const { service } = makeService(null);

      await expect(
        service.update('user-1', { isAdmin: true }, 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete()', () => {
    it('delegates to UsersService.deleteMe()', async () => {
      const { service, fakeUsersService } = makeService(makeUser());

      await service.delete('user-1', 'admin-1');

      expect(fakeUsersService.deleteMe).toHaveBeenCalledWith('user-1');
    });

    it('rejects deleting your own account', async () => {
      const { service, fakeUsersService } = makeService(makeUser());

      await expect(service.delete('user-1', 'user-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fakeUsersService.deleteMe).not.toHaveBeenCalled();
    });

    it('throws NotFound for a missing user', async () => {
      const { service } = makeService(null);

      await expect(service.delete('user-1', 'admin-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
