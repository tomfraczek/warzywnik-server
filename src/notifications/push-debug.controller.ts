import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { pushTestSchema, PushTestDto } from './dto/push-debug.schemas';
import { PushDebugService } from './push-debug.service';

@Public()
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
