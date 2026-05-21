import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AdminTokenGuard } from '../auth/admin-token.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { pushTestSchema, PushTestDto } from './dto/push-debug.schemas';
import { PushDebugService } from './push-debug.service';

@Public()
@UseGuards(AdminTokenGuard)
@Controller('v1/debug')
export class PushDebugController {
  constructor(private readonly pushDebugService: PushDebugService) {}

  @Post('push-test')
  pushTest(
    @Body(new ZodValidationPipe(pushTestSchema))
    body: PushTestDto,
  ) {
    return this.pushDebugService.runPushTest(body);
  }
}
