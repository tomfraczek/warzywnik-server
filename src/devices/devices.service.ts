import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserDevice } from './user-device.entity';
import { CreateDeviceDto } from './dto/device.schemas';
import { User } from '../users/user.entity';

@Injectable()
export class DevicesService {
  constructor(private readonly em: EntityManager) {}

  async upsert(user: User, dto: CreateDeviceDto) {
    const existing = await this.em.findOne(UserDevice, {
      expoPushToken: dto.expoPushToken,
    });

    if (existing) {
      existing.user = user;
      existing.platform = dto.platform;
      existing.isEnabled = true;
      existing.disabledReason = null;
      await this.em.flush();
      return this.serialize(existing);
    }

    const device = new UserDevice();
    device.user = user;
    device.platform = dto.platform;
    device.expoPushToken = dto.expoPushToken;
    device.isEnabled = true;
    device.disabledReason = null;

    await this.em.persistAndFlush(device);
    return this.serialize(device);
  }

  async disable(user: User, id: string) {
    const device = await this.em.findOne(UserDevice, {
      id,
      user: user.id,
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.isEnabled = false;
    device.disabledReason = 'USER_DISABLED';
    await this.em.flush();

    return this.serialize(device);
  }

  private serialize(device: UserDevice) {
    return {
      id: device.id,
      userId: device.user.id,
      platform: device.platform,
      expoPushToken: device.expoPushToken,
      isEnabled: device.isEnabled,
      lastSuccessAt: device.lastSuccessAt ?? null,
      lastErrorAt: device.lastErrorAt ?? null,
      lastErrorCode: device.lastErrorCode ?? null,
      disabledReason: device.disabledReason ?? null,
      lastReceiptCheckedAt: device.lastReceiptCheckedAt ?? null,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}
