import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { HarvestPromptsService } from './harvest-prompts.service';
import { User } from '../users/user.entity';
import {
  harvestConfirmationSchema,
  HarvestConfirmationDto,
} from './dto/harvest-prompt.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1')
export class HarvestPromptsController {
  constructor(private readonly harvestPromptsService: HarvestPromptsService) {}

  @Get('beds/:bedId/harvest-prompts')
  listForBed(
    @Req() req: { userEntity?: User },
    @Param('bedId', new ParseUUIDPipe()) bedId: string,
  ) {
    return this.harvestPromptsService.listForBed(req.userEntity as User, bedId);
  }

  @Post('plantings/:plantingId/harvest-confirmation')
  async confirmHarvest(
    @Req() req: { userEntity?: User },
    @Param('plantingId', new ParseUUIDPipe()) plantingId: string,
    @Body(new ZodValidationPipe(harvestConfirmationSchema))
    body: HarvestConfirmationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.harvestPromptsService.confirmHarvest(
      req.userEntity as User,
      plantingId,
      body,
    );

    if (!result) {
      res.status(204);
      return;
    }

    return result;
  }
}
