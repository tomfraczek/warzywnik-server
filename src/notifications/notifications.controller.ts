import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { User } from '../users/user.entity';
import { NotificationCenterService } from './notification-center.service';
import {
  ListNotificationsQueryDto,
  listNotificationsQuerySchema,
} from './dto/notifications.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationCenterService: NotificationCenterService,
  ) {}

  @Get()
  list(
    @Req() req: RequestWithUser,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema))
    query: ListNotificationsQueryDto,
  ) {
    return this.notificationCenterService.list(req.userEntity as User, query);
  }

  @Get('summary')
  summary(@Req() req: RequestWithUser) {
    return this.notificationCenterService.summary(req.userEntity as User);
  }

  @Patch(':id/read')
  markRead(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationCenterService.markRead(req.userEntity as User, id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: RequestWithUser) {
    return this.notificationCenterService.markAllRead(req.userEntity as User);
  }

  @Patch(':id/opened')
  markOpened(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationCenterService.markOpened(
      req.userEntity as User,
      id,
    );
  }

  @Patch(':id/dismiss')
  dismiss(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationCenterService.dismiss(req.userEntity as User, id);
  }
}
