import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../users/user.entity';
import { TutorialsService } from './tutorials.service';
import { TutorialKey } from './tutorial.entity';
import {
  patchTutorialSchema,
  patchTutorialsGlobalSchema,
  tutorialKeySchema,
  type PatchTutorialDto,
  type PatchTutorialsGlobalDto,
} from './dto/tutorials.schemas';
import {
  TutorialsResponse,
  TutorialStateDto,
  TutorialsGlobalStateDto,
} from './dto/tutorials.types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

type RequestWithUser = { userEntity?: User };

@Controller('v1/users/me/tutorials')
export class TutorialsController {
  constructor(private readonly tutorialsService: TutorialsService) {}

  @Get()
  getTutorials(@Req() req: RequestWithUser): Promise<TutorialsResponse> {
    const user = this.getUser(req);
    return this.tutorialsService.getTutorials(user.id);
  }

  @Patch()
  patchTutorialsGlobal(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(patchTutorialsGlobalSchema))
    body: PatchTutorialsGlobalDto,
  ): Promise<TutorialsGlobalStateDto> {
    const user = this.getUser(req);
    return this.tutorialsService.patchTutorialsGlobal(user.id, body.enabled);
  }

  @Patch(':key')
  patchTutorial(
    @Req() req: RequestWithUser,
    @Param('key', new ZodValidationPipe(tutorialKeySchema)) key: TutorialKey,
    @Body(new ZodValidationPipe(patchTutorialSchema)) body: PatchTutorialDto,
  ): Promise<TutorialStateDto> {
    const user = this.getUser(req);
    return this.tutorialsService.patchTutorial(user.id, key, body);
  }

  @Post('reset')
  @HttpCode(204)
  async resetAllTutorials(@Req() req: RequestWithUser): Promise<void> {
    const user = this.getUser(req);
    await this.tutorialsService.resetAllTutorials(user.id);
  }

  @Post(':key/reset')
  @HttpCode(200)
  resetTutorial(
    @Req() req: RequestWithUser,
    @Param('key', new ZodValidationPipe(tutorialKeySchema)) key: TutorialKey,
  ): Promise<TutorialStateDto> {
    const user = this.getUser(req);
    return this.tutorialsService.resetTutorial(user.id, key);
  }

  private getUser(req: RequestWithUser): User {
    if (!req.userEntity) {
      throw new UnauthorizedException('Missing user context');
    }
    return req.userEntity;
  }
}
