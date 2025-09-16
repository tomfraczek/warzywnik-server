import { Injectable } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

/**
 * Keeps a minimal "shadow user" and non-PII settings.
 * Variant A: GET /users/me performs find-or-create by Clerk user id.
 */
@Injectable()
export class UserService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(User) private readonly userRepo: EntityRepository<User>,
    @InjectRepository(UserSettings)
    private readonly settingsRepo: EntityRepository<UserSettings>,
  ) {}

  /**
   * Find or create user + settings for given Clerk user id.
   * Idempotent and safe to call multiple times.
   */
  async getOrCreateMeByClerkId(clerkUserId: string) {
    // 0) Spróbuj znaleźć
    let user = await this.userRepo.findOne({ clerkUserId });
    if (!user) {
      console.log('[users] creating user', clerkUserId);
      await this.em.transactional(async (tem) => {
        // utwórz user
        const newUser = tem.create(User, { clerkUserId });
        // utwórz settings
        const newSettings = tem.create(UserSettings, { user: newUser });
        // flush jednorazowy – wymusza INSERT-y
        await tem.persistAndFlush([newUser, newSettings]);
        user = newUser;
      });
    } else {
      console.log('[users] user exists', clerkUserId);
      // dopilnuj settings przy starych danych
      const existing = await this.settingsRepo.findOne({ user });
      if (!existing) {
        console.log('[users] creating missing settings', clerkUserId);
        const s = this.settingsRepo.create({ user });
        await this.em.persistAndFlush(s);
      }
    }

    const settings = await this.settingsRepo.findOne({ user: user! });
    return this.toPublicUser(user!, settings ?? undefined);
  }

  /**
   * Update non-PII settings for current user.
   */
  async updateSettings(clerkUserId: string, dto: UpdateUserSettingsDto) {
    const user = await this.userRepo.findOneOrFail({ clerkUserId });
    let settings = await this.settingsRepo.findOne({ user });
    if (!settings) {
      settings = this.settingsRepo.create({ user });
      this.em.persist(settings);
    }
    wrap(settings).assign(dto, { merge: true });
    await this.em.flush();
    return this.toPublicUser(user, settings);
  }

  private toPublicUser(
    user: User,
    settings?: UserSettings,
  ): {
    id: string;
    clerkUserId: string;
    isAdmin: boolean;
    status: 'active' | 'blocked';
    createdAt: Date;
    updatedAt: Date;
    settings?: {
      unitLength: 'cm' | 'inch';
      unitArea: 'm2' | 'ft2';
      locale: 'pl' | 'en';
      darkMode: boolean;
      updatedAt: Date;
    };
  } {
    return {
      id: user.id,
      clerkUserId: user.clerkUserId,
      isAdmin: user.isAdmin,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      settings: settings
        ? {
            unitLength: settings.unitLength,
            unitArea: settings.unitArea,
            locale: settings.locale,
            darkMode: settings.darkMode,
            updatedAt: settings.updatedAt,
          }
        : undefined,
    };
  }
}
