import { Controller, Post, Delete, Body, Param, Get } from '@nestjs/common';
import { CompanionRulesService } from './companion-rules.service';
import { CreateCompanionRuleDto } from './dto/create-companion-rule.dto';

@Controller('companions')
export class CompanionRulesController {
  constructor(private readonly companionRulesService: CompanionRulesService) {}

  @Post()
  create(@Body() body: CreateCompanionRuleDto) {
    return this.companionRulesService.create(body);
  }

  @Get()
  findAll() {
    return this.companionRulesService.findAll();
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.companionRulesService.delete(id);
  }
}
