import { Controller, Get } from '@nestjs/common';
import { ActionAutomationService } from './action-automation.service';

@Controller('v1/action-automation')
export class ActionAutomationController {
  constructor(
    private readonly actionAutomationService: ActionAutomationService,
  ) {}

  @Get('coverage')
  getCoverage() {
    return this.actionAutomationService.getCoverage();
  }
}
