import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from './user.entity';
import { PatchMeDto } from './dto/me.schemas';
import {
  AreaUnit,
  Language,
  LocationMode,
  PrecipitationUnit,
  TemperatureUnit,
  ThemeMode,
} from '../common/enums/user.enums';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';

export type MeResponse = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarId: string | null;
  themeMode: ThemeMode;
  language: Language;
  temperatureUnit: TemperatureUnit;
  precipitationUnit: PrecipitationUnit;
  areaUnit: AreaUnit;
  locationMode: LocationMode;
  locationLabel: string | null;
  locationLat: number | null;
  locationLon: number | null;
  locationUpdatedAt: Date | null;
};

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

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.em.findOne(User, { id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toMeResponse(user);
  }

  async patchMe(userId: string, dto: PatchMeDto): Promise<MeResponse> {
    const user = await this.em.findOne(User, { id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }

    if (dto.avatarId !== undefined) {
      user.avatarId = dto.avatarId;
    }

    if (dto.themeMode !== undefined) {
      user.themeMode = dto.themeMode;
    }

    if (dto.language !== undefined) {
      user.language = dto.language;
    }

    if (dto.temperatureUnit !== undefined) {
      user.temperatureUnit = dto.temperatureUnit;
    }

    if (dto.precipitationUnit !== undefined) {
      user.precipitationUnit = dto.precipitationUnit;
    }

    if (dto.areaUnit !== undefined) {
      user.areaUnit = dto.areaUnit;
    }

    if (dto.locationMode !== undefined) {
      user.locationMode = dto.locationMode;
    }

    if (dto.locationLabel !== undefined) {
      user.locationLabel = dto.locationLabel;
    }

    if (dto.locationLat !== undefined) {
      user.locationLat = dto.locationLat;
    }

    if (dto.locationLon !== undefined) {
      user.locationLon = dto.locationLon;
    }

    const locationTouched =
      dto.locationMode !== undefined ||
      dto.locationLabel !== undefined ||
      dto.locationLat !== undefined ||
      dto.locationLon !== undefined;

    if (locationTouched) {
      user.locationUpdatedAt = new Date();
    }

    this.validateLocationConsistency(user);

    await this.em.flush();

    return this.toMeResponse(user);
  }

  async deleteMe(userId: string): Promise<void> {
    await this.em.transactional(async (em) => {
      await em.nativeDelete(Planting, { user: userId });
      await em.nativeDelete(Bed, { user: userId });

      const user = await em.findOne(User, { id: userId });
      if (user) {
        await em.removeAndFlush(user);
      }
    });
  }

  async exportMe(userId: string): Promise<MeResponse> {
    return this.getMe(userId);
  }

  private validateLocationConsistency(user: User) {
    const hasLat = user.locationLat != null;
    const hasLon = user.locationLon != null;

    if (hasLat !== hasLon) {
      throw new BadRequestException(
        'locationLat and locationLon must be provided together',
      );
    }

    if (user.locationMode !== LocationMode.NONE) {
      const hasLabel = user.locationLabel != null;
      const hasCoords = hasLat && hasLon;

      if (!hasLabel && !hasCoords) {
        throw new BadRequestException(
          'locationLabel or locationLat/locationLon required when locationMode is not none',
        );
      }
    }
  }

  private toMeResponse(user: User): MeResponse {
    return {
      id: user.id,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      avatarId: user.avatarId ?? null,
      themeMode: user.themeMode,
      language: user.language,
      temperatureUnit: user.temperatureUnit,
      precipitationUnit: user.precipitationUnit,
      areaUnit: user.areaUnit,
      locationMode: user.locationMode,
      locationLabel: user.locationLabel ?? null,
      locationLat: user.locationLat ?? null,
      locationLon: user.locationLon ?? null,
      locationUpdatedAt: user.locationUpdatedAt ?? null,
    };
  }
}
