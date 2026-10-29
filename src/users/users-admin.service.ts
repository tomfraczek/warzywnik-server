import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { EntityManager } from '@mikro-orm/postgresql';
import type { FilterQuery, QueryOrderKeysFlat } from '@mikro-orm/core';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { SubscriptionPlan } from '../common/enums/user.enums';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';
import { Note } from '../notes/note.entity';
import { GrowingSpace } from '../growing-spaces/growing-space.entity';
import { UserDevice } from '../devices/user-device.entity';
import {
  ListAdminUsersQueryDto,
  PatchAdminUserDto,
} from './dto/admin-users.schemas';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class UsersAdminService {
  private readonly logger = new Logger(UsersAdminService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly usersService: UsersService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async list(query: ListAdminUsersQueryDto) {
    const { search, plan, isActive, isAdmin, page, limit } = query;
    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';
    const offset = (page - 1) * limit;
    const now = new Date();

    const conditions: FilterQuery<User>[] = [];

    if (search) {
      const searchConditions: FilterQuery<User>[] = [
        { email: { $ilike: `%${search}%` } },
        { displayName: { $ilike: `%${search}%` } },
        { clerkUserId: search },
      ];
      if (UUID_PATTERN.test(search)) {
        searchConditions.push({ id: search });
      }
      conditions.push({ $or: searchConditions });
    }

    if (isActive !== undefined) {
      conditions.push({ isActive });
    }

    if (isAdmin !== undefined) {
      conditions.push({ isAdmin });
    }

    if (plan) {
      conditions.push(this.planFilter(plan, now));
    }

    const [items, total] = await this.em.findAndCount(
      User,
      conditions.length ? { $and: conditions } : {},
      {
        orderBy: {
          [sort]: `${order} nulls last` as QueryOrderKeysFlat,
          id: 'asc',
        },
        limit,
        offset,
      },
    );

    return {
      items: items.map((user) => this.serializeListItem(user, now)),
      total,
      page,
      limit,
    };
  }

  async getById(id: string) {
    const user = await this.em.findOne(User, { id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.serializeDetails(user);
  }

  async update(id: string, dto: PatchAdminUserDto, actingUserId: string) {
    const user = await this.em.findOne(User, { id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (user.id === actingUserId) {
      if (dto.isActive === false) {
        throw new BadRequestException('You cannot block your own account');
      }
      if (dto.isAdmin === false) {
        throw new BadRequestException(
          'You cannot revoke admin rights from your own account',
        );
      }
    }

    const wasActive = user.isActive;

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.isAdmin !== undefined) user.isAdmin = dto.isAdmin;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.subscriptionPlan !== undefined) {
      user.subscriptionPlan = dto.subscriptionPlan;
    }
    if (dto.subscriptionExpiresAt !== undefined) {
      user.subscriptionExpiresAt = dto.subscriptionExpiresAt;
    }
    if (dto.trialStartedAt !== undefined) {
      user.trialStartedAt = dto.trialStartedAt;
    }
    if (dto.trialEndsAt !== undefined) user.trialEndsAt = dto.trialEndsAt;
    if (dto.notificationsEnabled !== undefined) {
      user.notificationsEnabled = dto.notificationsEnabled;
    }
    if (dto.automaticTasksEnabled !== undefined) {
      user.automaticTasksEnabled = dto.automaticTasksEnabled;
    }
    if (dto.tutorialsEnabled !== undefined) {
      user.tutorialsEnabled = dto.tutorialsEnabled;
    }
    if (dto.notificationHour !== undefined) {
      user.notificationHour = dto.notificationHour;
    }
    if (dto.themeMode !== undefined) user.themeMode = dto.themeMode;
    if (dto.language !== undefined) user.language = dto.language;
    if (dto.locale !== undefined) user.locale = dto.locale;
    if (dto.timezone !== undefined) user.timezone = dto.timezone;

    await this.em.flush();

    if (wasActive !== user.isActive) {
      await this.syncClerkBan(user.clerkUserId, user.id, !user.isActive);
    }

    return this.serializeDetails(user);
  }

  async delete(id: string, actingUserId: string): Promise<void> {
    if (id === actingUserId) {
      throw new BadRequestException('You cannot delete your own account here');
    }

    const user = await this.em.findOne(User, { id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    await this.usersService.deleteMe(id);
  }

  private planFilter(
    plan: NonNullable<ListAdminUsersQueryDto['plan']>,
    now: Date,
  ): FilterQuery<User> {
    const hasSubscription: FilterQuery<User> = {
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      subscriptionExpiresAt: { $gt: now },
    };
    const noSubscription: FilterQuery<User> = {
      $or: [
        { subscriptionPlan: { $ne: SubscriptionPlan.PREMIUM } },
        { subscriptionExpiresAt: null },
        { subscriptionExpiresAt: { $lte: now } },
      ],
    };

    if (plan === 'subscription') {
      return hasSubscription;
    }

    if (plan === 'trial') {
      return { $and: [noSubscription, { trialEndsAt: { $gt: now } }] };
    }

    return {
      $and: [
        noSubscription,
        { $or: [{ trialEndsAt: null }, { trialEndsAt: { $lte: now } }] },
      ],
    };
  }

  // Local isActive is the source of truth (enforced in ClerkAuthGuard);
  // the Clerk ban additionally prevents signing in. Failures are logged only.
  private async syncClerkBan(
    clerkUserId: string,
    localUserId: string,
    banned: boolean,
  ): Promise<void> {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn(
        `admin user=${localUserId}: CLERK_SECRET_KEY not set, skipping Clerk ban sync`,
      );
      return;
    }

    try {
      const clerk = createClerkClient({ secretKey });
      if (banned) {
        await clerk.users.banUser(clerkUserId);
      } else {
        await clerk.users.unbanUser(clerkUserId);
      }
    } catch (err: unknown) {
      this.logger.error(
        `admin user=${localUserId}: failed to ${banned ? 'ban' : 'unban'} Clerk user clerkUserId=${clerkUserId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  private serializeListItem(user: User, now: Date) {
    return {
      id: user.id,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      avatarId: user.avatarId ?? null,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      planSource: this.entitlementsService.resolveSource(user, now),
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async serializeDetails(user: User) {
    const now = new Date();
    const [beds, plantings, notes, growingSpaces, devices] = await Promise.all([
      this.em.count(Bed, { user: user.id }),
      this.em.count(Planting, { user: user.id }),
      this.em.count(Note, { user: user.id }),
      this.em.count(GrowingSpace, { user: user.id }),
      this.em.count(UserDevice, { user: user.id }),
    ]);

    return {
      ...this.serializeListItem(user, now),
      clerkUserId: user.clerkUserId,
      trialStartedAt: user.trialStartedAt?.toISOString() ?? null,
      themeMode: user.themeMode,
      language: user.language,
      locale: user.locale,
      timezone: user.timezone,
      notificationsEnabled: user.notificationsEnabled,
      notificationHour: user.notificationHour,
      automaticTasksEnabled: user.automaticTasksEnabled,
      tutorialsEnabled: user.tutorialsEnabled,
      locationMode: user.locationMode,
      locationLabel: user.locationLabel ?? null,
      updatedAt: user.updatedAt.toISOString(),
      stats: { beds, plantings, notes, growingSpaces, devices },
    };
  }
}
