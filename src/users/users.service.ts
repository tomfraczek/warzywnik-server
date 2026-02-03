import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  async getOrCreateFromClerkSub(params: {
    clerkUserId: string;
    email?: string | null;
    displayName?: string | null;
  }): Promise<User> {
    const { clerkUserId, email, displayName } = params;

    let user = await this.em.findOne(User, { clerkUserId });

    if (!user) {
      user = new User();
      user.clerkUserId = clerkUserId;
      user.email = email ?? null;
      user.displayName = displayName ?? null;
      user.lastLoginAt = new Date();
      await this.em.persistAndFlush(user);
      return user;
    }

    let changed = false;

    if (email !== undefined && email !== user.email) {
      user.email = email;
      changed = true;
    }

    if (displayName !== undefined && displayName !== user.displayName) {
      user.displayName = displayName;
      changed = true;
    }

    user.lastLoginAt = new Date();
    changed = true;

    if (changed) {
      await this.em.flush();
    }

    return user;
  }
}
