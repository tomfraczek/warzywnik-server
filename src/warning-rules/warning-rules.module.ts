import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WarningRule } from './warning-rule.entity';
import { WarningRulesService } from './warning-rules.service';
import { WarningRulesController } from './warning-rules.controller';
import { WarningsService } from './warnings.service';
import { WarningRulesSeedService } from './warning-rules.seed.service';

@Module({
  imports: [MikroOrmModule.forFeature([WarningRule])],
  providers: [WarningRulesService, WarningsService, WarningRulesSeedService],
  controllers: [WarningRulesController],
  exports: [WarningRulesService, WarningsService],
})
export class WarningRulesModule {}
