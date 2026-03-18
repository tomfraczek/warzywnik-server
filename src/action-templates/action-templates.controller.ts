import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ActionTemplatesService } from './action-templates.service';
import {
  createActionTemplateSchema,
  deleteActionTemplatesBulkSchema,
  listActionTemplatesQuerySchema,
  updateActionTemplateSchema,
  CreateActionTemplateDto,
  DeleteActionTemplatesBulkDto,
  ListActionTemplatesQueryDto,
  UpdateActionTemplateDto,
} from './dto/action-template.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/action-templates')
export class ActionTemplatesController {
  constructor(
    private readonly actionTemplatesService: ActionTemplatesService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listActionTemplatesQuerySchema))
    query: ListActionTemplatesQueryDto,
  ) {
    return this.actionTemplatesService.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.actionTemplatesService.getById(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createActionTemplateSchema))
    body: CreateActionTemplateDto,
  ) {
    return this.actionTemplatesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateActionTemplateSchema))
    body: UpdateActionTemplateDto,
  ) {
    return this.actionTemplatesService.update(id, body);
  }

  @Delete()
  @HttpCode(204)
  async removeBulk(
    @Body(new ZodValidationPipe(deleteActionTemplatesBulkSchema))
    body: DeleteActionTemplatesBulkDto,
  ) {
    await this.actionTemplatesService.removeMany(body.ids);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.actionTemplatesService.remove(id);
  }
}
