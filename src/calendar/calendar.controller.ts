import { Controller, Get, Query, Req } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  getCalendarQuerySchema,
  GetCalendarQueryDto,
} from './dto/calendar.schemas';
import { User } from '../users/user.entity';

@Controller('v1/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  getCalendar(
    @Req() req: { userEntity?: User },
    @Query(new ZodValidationPipe(getCalendarQuerySchema))
    query: GetCalendarQueryDto,
  ) {
    return this.calendarService.getCalendar(req.userEntity as User, query);
  }
}
