import {
  Entity,
  Enum,
  Index,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import {
  AreaUnit,
  Language,
  LocationMode,
  PrecipitationUnit,
  TemperatureUnit,
  ThemeMode,
  Units,
  UserSubscription,
} from '../common/enums/user.enums';

@Entity({ tableName: 'users' })
@Index({ properties: ['isAdmin'] })
@Index({ properties: ['subscription'] })
@Index({ properties: ['isActive'] })
export class User {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 255 })
  @Unique()
  clerkUserId!: string;

  @Property({ length: 255, nullable: true, unique: true })
  email?: string | null;

  @Property({ length: 255, nullable: true })
  displayName?: string | null;

  @Property({ length: 32, nullable: true })
  avatarId?: string | null;

  @Enum({ items: () => ThemeMode, default: ThemeMode.SYSTEM })
  themeMode: ThemeMode = ThemeMode.SYSTEM;

  @Enum({ items: () => Language, default: Language.SYSTEM })
  language: Language = Language.SYSTEM;

  @Enum({ items: () => TemperatureUnit, default: TemperatureUnit.C })
  temperatureUnit: TemperatureUnit = TemperatureUnit.C;

  @Enum({ items: () => PrecipitationUnit, default: PrecipitationUnit.MM })
  precipitationUnit: PrecipitationUnit = PrecipitationUnit.MM;

  @Enum({ items: () => AreaUnit, default: AreaUnit.M2 })
  areaUnit: AreaUnit = AreaUnit.M2;

  @Enum({ items: () => LocationMode, default: LocationMode.NONE })
  locationMode: LocationMode = LocationMode.NONE;

  @Property({ length: 200, nullable: true })
  locationLabel?: string | null;

  @Property({ type: 'double', nullable: true })
  locationLat?: number | null;

  @Property({ type: 'double', nullable: true })
  locationLon?: number | null;

  @Property({ type: Date, nullable: true })
  locationUpdatedAt?: Date | null;

  @Property({ type: 'boolean', default: false })
  isAdmin: boolean = false;

  @Enum({ items: () => UserSubscription, default: UserSubscription.STANDARD })
  subscription: UserSubscription = UserSubscription.STANDARD;

  @Property({ length: 16, default: 'pl' })
  locale: string = 'pl';

  @Property({ length: 64, default: 'Europe/Warsaw' })
  timezone: string = 'Europe/Warsaw';

  @Property({ type: 'boolean', default: true })
  notificationsEnabled: boolean = true;

  @Property({ type: 'int', default: 9 })
  notificationHour: number = 9;

  @Enum({ items: () => Units, default: Units.METRIC })
  units: Units = Units.METRIC;

  @Property({ type: 'int', default: 1 })
  weekStartsOn: number = 1;

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ type: Date, nullable: true })
  lastLoginAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
