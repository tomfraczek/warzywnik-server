import { Controller, Get, Req } from '@nestjs/common';
import { ActionAutomationService } from './action-automation.service';
import { User } from '../users/user.entity';

@Controller('v1/action-automation')
export class ActionAutomationController {
  constructor(
    private readonly actionAutomationService: ActionAutomationService,
  ) {}

  @Get('coverage')
  getCoverage(@Req() _req: { userEntity?: User }) {
    return this.actionAutomationService.getCoverage();
  }
}
