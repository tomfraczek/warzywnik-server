import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  Body,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import {
  listRemindersQuerySchema,
  patchReminderSchema,
  ListRemindersQueryDto,
  PatchReminderDto,
} from './dto/reminder.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { User } from '../users/user.entity';

type RequestWithUser = {
  userEntity?: User;
};

@Controller('v1/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list(
    @Req() req: RequestWithUser,
    @Query(new ZodValidationPipe(listRemindersQuerySchema))
    query: ListRemindersQueryDto,
  ) {
    return this.remindersService.list(req.userEntity as User, query);
  }

  @Patch(':id')
  patch(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(patchReminderSchema)) body: PatchReminderDto,
  ) {
    return this.remindersService.patch(req.userEntity as User, id, body);
  }
}
