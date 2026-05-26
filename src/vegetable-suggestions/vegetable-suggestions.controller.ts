import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VegetableSuggestionsService } from './vegetable-suggestions.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createVegetableSuggestionSchema,
  listAdminVegetableSuggestionsQuerySchema,
  CreateVegetableSuggestionDto,
  ListAdminVegetableSuggestionsQueryDto,
} from './dto/vegetable-suggestion.schemas';
import { AdminTokenGuard } from '../auth/admin-token.guard';

type RequestWithUser = {
  userEntity?: { id: string };
};

@Controller('v1/vegetable-suggestions')
export class VegetableSuggestionsController {
  constructor(
    private readonly vegetableSuggestionsService: VegetableSuggestionsService,
  ) {}

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(createVegetableSuggestionSchema))
    body: CreateVegetableSuggestionDto,
  ) {
    const userId = req.userEntity?.id ?? null;
    return this.vegetableSuggestionsService.create(body, userId);
  }
}

@Controller('v1/admin/vegetable-suggestions')
@UseGuards(AdminTokenGuard)
export class VegetableSuggestionsAdminController {
  constructor(
    private readonly vegetableSuggestionsService: VegetableSuggestionsService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAdminVegetableSuggestionsQuerySchema))
    query: ListAdminVegetableSuggestionsQueryDto,
  ) {
    return this.vegetableSuggestionsService.listAdmin(query);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.vegetableSuggestionsService.delete(id);
  }
}
