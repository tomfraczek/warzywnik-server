import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { User } from '../users/user.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import {
  PatchNotificationPreferencesDto,
  patchNotificationPreferencesSchema,
} from './dto/notification-preferences.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/users/me/notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  getPreferences(@Req() req: RequestWithUser) {
    return this.notificationPreferencesService.getForUser(
      (req.userEntity as User).id,
    );
  }

  @Patch()
  patchPreferences(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(patchNotificationPreferencesSchema))
    body: PatchNotificationPreferencesDto,
  ) {
    return this.notificationPreferencesService.patchForUser(
      (req.userEntity as User).id,
      body,
    );
  }
}
