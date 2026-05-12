import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from './user.entity';
import { PatchMeDto } from './dto/me.schemas';
import { LocationMode } from '../common/enums/user.enums';
import { MeResponse } from './dto/me.types';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';
import { UpdateMyLocationDto } from './dto/location.schemas';
import { UserLocationResponseDto } from './dto/location.types';
import { Location } from '../locations/location.entity';
import { LocationRecordMode } from '../common/enums/location.enums';
import { LocationEventsService } from '../locations/location-events.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly em: EntityManager,
    private readonly locationEventsService: LocationEventsService,
  ) {}

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
    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['location'] },
    );

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

    if (dto.automaticTasksEnabled !== undefined) {
      user.automaticTasksEnabled = dto.automaticTasksEnabled;
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

  async updateMyLocation(
    userId: string,
    dto: UpdateMyLocationDto,
  ): Promise<UserLocationResponseDto> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['location'] },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const location = user.location ?? new Location();
    const now = new Date();

    if (dto.mode === 'MANUAL') {
      this.applyManualLocation(location, dto);

      user.locationMode = LocationMode.MANUAL;
      user.locationLabel = location.label;
      user.locationLat = location.lat;
      user.locationLon = location.lon;
      user.locationUpdatedAt = now;
    }

    if (dto.mode === 'DEVICE') {
      this.applyDeviceLocation(location, dto);

      user.locationMode = LocationMode.CURRENT;
      user.locationLabel = location.label;
      user.locationLat = location.lat;
      user.locationLon = location.lon;
      user.locationUpdatedAt = now;
    }

    location.updatedAt = now;

    if (!user.location) {
      this.em.persist(location);
      user.location = location;
    }

    await this.em.flush();

    this.locationEventsService.emitLocationUpdated({
      userId: user.id,
      locationId: location.id,
      mode: location.mode,
      lat: location.lat,
      lon: location.lon,
      updatedAt: location.updatedAt.toISOString(),
    });

    return this.toUserLocationResponse(location);
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

  private applyManualLocation(
    location: Location,
    dto: UpdateMyLocationDto,
  ): void {
    if (dto.accuracyM !== undefined) {
      throw new BadRequestException(
        'accuracyM is allowed only for DEVICE mode',
      );
    }

    location.mode = LocationRecordMode.MANUAL;
    location.label = dto.label;
    location.lat = dto.lat;
    location.lon = dto.lon;
    location.accuracyM = null;
    location.providerPlaceId = dto.providerPlaceId ?? null;
  }

  private applyDeviceLocation(
    location: Location,
    dto: UpdateMyLocationDto,
  ): void {
    if (dto.providerPlaceId !== undefined) {
      throw new BadRequestException(
        'providerPlaceId is allowed only for MANUAL mode',
      );
    }

    location.mode = LocationRecordMode.DEVICE;
    location.label = dto.label;
    location.lat = dto.lat;
    location.lon = dto.lon;
    location.accuracyM = dto.accuracyM ?? null;
    location.providerPlaceId = null;
  }

  private toUserLocationResponse(location: Location): UserLocationResponseDto {
    return {
      id: location.id,
      mode: location.mode,
      label: location.label,
      lat: location.lat,
      lon: location.lon,
      accuracyM: location.accuracyM ?? null,
      providerPlaceId: location.providerPlaceId ?? null,
      updatedAt: location.updatedAt,
    };
  }

  private toMeResponse(user: User): MeResponse {
    const sourceLocation =
      user.location && user.location.label && Number.isFinite(user.location.lat)
        ? user.location
        : null;

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
      locationMode:
        sourceLocation?.mode === LocationRecordMode.MANUAL
          ? LocationMode.MANUAL
          : sourceLocation?.mode === LocationRecordMode.DEVICE
            ? LocationMode.CURRENT
            : user.locationMode,
      locationLabel: sourceLocation?.label ?? user.locationLabel ?? null,
      locationLat: sourceLocation?.lat ?? user.locationLat ?? null,
      locationLon: sourceLocation?.lon ?? user.locationLon ?? null,
      locationUpdatedAt:
        sourceLocation?.updatedAt ?? user.locationUpdatedAt ?? null,
      automaticTasksEnabled: user.automaticTasksEnabled,
    };
  }
}
