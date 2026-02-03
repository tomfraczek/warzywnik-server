import { Controller, Get, Req } from '@nestjs/common';
import { User } from './user.entity';

@Controller()
export class UsersController {
  @Get('me')
  me(
    @Req()
    req: {
      userEntity?: User;
    },
  ) {
    const user = req.userEntity as User;

    return {
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      isAdmin: user.isAdmin,
      subscription: user.subscription,
      locale: user.locale,
      timezone: user.timezone,
      notificationsEnabled: user.notificationsEnabled,
      notificationHour: user.notificationHour,
      units: user.units,
      weekStartsOn: user.weekStartsOn,
      isActive: user.isActive,
    };
  }
}
