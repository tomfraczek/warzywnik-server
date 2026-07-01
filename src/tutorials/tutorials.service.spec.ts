import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { TutorialsService } from './tutorials.service';
import { UserTutorial, TutorialKey } from './tutorial.entity';
import { User } from '../users/user.entity';

const USER_ID = 'user-uuid-111';

const makeUser = (overrides: Partial<User> = {}): User => {
  const u = new User();
  u.id = USER_ID;
  u.clerkUserId = 'clerk_abc';
  u.tutorialsEnabled = true;
  return Object.assign(u, overrides);
};

const makeTutorial = (
  key: TutorialKey,
  overrides: Partial<UserTutorial> = {},
): UserTutorial => {
  const t = new UserTutorial();
  t.id = 'tut-uuid-1';
  t.user = makeUser();
  t.tutorialKey = key;
  t.completed = false;
  t.version = 1;
  t.completedAt = null;
  t.createdAt = new Date('2026-06-30T00:00:00Z');
  t.updatedAt = new Date('2026-06-30T00:00:00Z');
  return Object.assign(t, overrides);
};

describe('TutorialsService', () => {
  let service: TutorialsService;
  let em: {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    persist: jest.Mock;
    flush: jest.Mock;
    nativeDelete: jest.Mock;
    getReference: jest.Mock;
  };

  beforeEach(async () => {
    em = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
      nativeDelete: jest.fn(),
      getReference: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TutorialsService, { provide: EntityManager, useValue: em }],
    }).compile();

    service = module.get<TutorialsService>(TutorialsService);
  });

  // ─── getTutorials ────────────────────────────────────────────────────────────

  describe('getTutorials', () => {
    it('returns enabled=true and empty tutorials map when user has no records', async () => {
      em.findOneOrFail.mockResolvedValue(makeUser());
      em.find.mockResolvedValue([]);

      const result = await service.getTutorials(USER_ID);

      expect(result).toEqual({ enabled: true, tutorials: {} });
    });

    it('returns enabled=false with existing tutorial records', async () => {
      em.findOneOrFail.mockResolvedValue(makeUser({ tutorialsEnabled: false }));
      const t1 = makeTutorial(TutorialKey.HOME, {
        completed: true,
        version: 1,
        completedAt: new Date('2026-06-30T10:00:00Z'),
      });
      em.find.mockResolvedValue([t1]);

      const result = await service.getTutorials(USER_ID);

      expect(result.enabled).toBe(false);
      expect(result.tutorials).toEqual({
        home: {
          completed: true,
          version: 1,
          completedAt: '2026-06-30T10:00:00.000Z',
        },
      });
    });

    it('maps multiple tutorial records by key', async () => {
      em.findOneOrFail.mockResolvedValue(makeUser());
      const t1 = makeTutorial(TutorialKey.HOME, {
        completed: true,
        version: 1,
        completedAt: new Date('2026-06-30T10:00:00Z'),
      });
      const t2 = makeTutorial(TutorialKey.CALENDAR, {
        completed: false,
        version: 1,
        completedAt: null,
      });
      em.find.mockResolvedValue([t1, t2]);

      const result = await service.getTutorials(USER_ID);

      expect(result.tutorials).toEqual({
        home: {
          completed: true,
          version: 1,
          completedAt: '2026-06-30T10:00:00.000Z',
        },
        calendar: { completed: false, version: 1, completedAt: null },
      });
    });
  });

  // ─── patchTutorialsGlobal ────────────────────────────────────────────────────

  describe('patchTutorialsGlobal', () => {
    it('sets enabled=false without touching tutorial records', async () => {
      const user = makeUser({ tutorialsEnabled: true });
      em.findOneOrFail.mockResolvedValue(user);
      em.flush.mockResolvedValue(undefined);

      const result = await service.patchTutorialsGlobal(USER_ID, false);

      expect(result).toEqual({ enabled: false });
      expect(em.nativeDelete).not.toHaveBeenCalled();
      expect(user.tutorialsEnabled).toBe(false);
    });

    it('sets enabled=true without touching tutorial records', async () => {
      const user = makeUser({ tutorialsEnabled: false });
      em.findOneOrFail.mockResolvedValue(user);
      em.flush.mockResolvedValue(undefined);

      const result = await service.patchTutorialsGlobal(USER_ID, true);

      expect(result).toEqual({ enabled: true });
      expect(em.nativeDelete).not.toHaveBeenCalled();
      expect(user.tutorialsEnabled).toBe(true);
    });
  });

  // ─── patchTutorial ───────────────────────────────────────────────────────────

  describe('patchTutorial', () => {
    it('creates a new record when none exists and marks completed', async () => {
      em.findOne.mockResolvedValue(null);
      em.getReference.mockReturnValue(makeUser());
      em.flush.mockResolvedValue(undefined);

      const result = await service.patchTutorial(USER_ID, TutorialKey.HOME, {
        completed: true,
        version: 1,
      });

      expect(em.persist).toHaveBeenCalled();
      expect(result.completed).toBe(true);
      expect(result.version).toBe(1);
      expect(result.completedAt).not.toBeNull();
    });

    it('updates existing record', async () => {
      const existing = makeTutorial(TutorialKey.BEDS);
      em.findOne.mockResolvedValue(existing);
      em.flush.mockResolvedValue(undefined);

      const result = await service.patchTutorial(USER_ID, TutorialKey.BEDS, {
        completed: true,
        version: 2,
      });

      expect(em.persist).not.toHaveBeenCalled();
      expect(result.completed).toBe(true);
      expect(result.version).toBe(2);
      expect(result.completedAt).not.toBeNull();
    });

    it('clears completedAt when completed is false', async () => {
      const existing = makeTutorial(TutorialKey.BEDS, {
        completed: true,
        completedAt: new Date('2026-06-30T10:00:00Z'),
      });
      em.findOne.mockResolvedValue(existing);
      em.flush.mockResolvedValue(undefined);

      const result = await service.patchTutorial(USER_ID, TutorialKey.BEDS, {
        completed: false,
        version: 1,
      });

      expect(result.completed).toBe(false);
      expect(result.completedAt).toBeNull();
    });

    it('creates a new record and leaves completedAt null when completed is false', async () => {
      em.findOne.mockResolvedValue(null);
      em.getReference.mockReturnValue(makeUser());
      em.flush.mockResolvedValue(undefined);

      const result = await service.patchTutorial(
        USER_ID,
        TutorialKey.CALENDAR,
        {
          completed: false,
          version: 1,
        },
      );

      expect(result.completed).toBe(false);
      expect(result.completedAt).toBeNull();
    });
  });

  // ─── resetTutorial ───────────────────────────────────────────────────────────

  describe('resetTutorial', () => {
    it('resets a completed tutorial', async () => {
      const existing = makeTutorial(TutorialKey.HOME, {
        completed: true,
        completedAt: new Date('2026-06-30T10:00:00Z'),
        version: 2,
      });
      em.findOne.mockResolvedValue(existing);
      em.flush.mockResolvedValue(undefined);

      const result = await service.resetTutorial(USER_ID, TutorialKey.HOME);

      expect(result.completed).toBe(false);
      expect(result.completedAt).toBeNull();
      expect(result.version).toBe(2);
    });

    it('throws NotFoundException when tutorial does not exist', async () => {
      em.findOne.mockResolvedValue(null);

      await expect(
        service.resetTutorial(USER_ID, TutorialKey.ARTICLES),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── resetAllTutorials ───────────────────────────────────────────────────────

  describe('resetAllTutorials', () => {
    it('deletes all tutorial records for the user', async () => {
      em.nativeDelete.mockResolvedValue(3);

      await service.resetAllTutorials(USER_ID);

      expect(em.nativeDelete).toHaveBeenCalledWith(UserTutorial, {
        user: { id: USER_ID },
      });
    });
  });
});
