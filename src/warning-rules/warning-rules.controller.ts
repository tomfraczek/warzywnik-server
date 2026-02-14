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
import { WarningRulesService } from './warning-rules.service';
import {
  createWarningRuleSchema,
  listWarningRulesQuerySchema,
  updateWarningRuleSchema,
  CreateWarningRuleDto,
  ListWarningRulesQueryDto,
  UpdateWarningRuleDto,
} from './dto/warning-rule.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/warning-rules')
export class WarningRulesController {
  constructor(private readonly warningRulesService: WarningRulesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listWarningRulesQuerySchema))
    query: ListWarningRulesQueryDto,
  ) {
    return this.warningRulesService.list(query);
  }

  @Get(':idOrCode')
  get(@Param('idOrCode') idOrCode: string) {
    return this.warningRulesService.getByIdOrCode(idOrCode);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createWarningRuleSchema))
    body: CreateWarningRuleDto,
  ) {
    return this.warningRulesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateWarningRuleSchema))
    body: UpdateWarningRuleDto,
  ) {
    return this.warningRulesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.warningRulesService.remove(id);
  }
}
