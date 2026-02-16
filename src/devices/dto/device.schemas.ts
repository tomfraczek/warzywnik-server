import { z } from 'zod';
import { DevicePlatform } from '../../common/enums/device.enums';

export type CreateDeviceDto = {
  expoPushToken: string;
  platform: DevicePlatform;
};

export type UpdateDeviceDto = {
  isEnabled: false;
};

export const createDeviceSchema = z.object({
  expoPushToken: z.string().min(10).max(255),
  platform: z.nativeEnum(DevicePlatform),
});

export const updateDeviceSchema = z.object({
  isEnabled: z.literal(false),
});
