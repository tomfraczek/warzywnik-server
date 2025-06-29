import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CompanionRulesController } from './companion-rules.controller';
import { CompanionRulesService } from './companion-rules.service';
import { CompanionRule } from './entities/companion-rule.entity';

@Module({
  imports: [MikroOrmModule.forFeature([CompanionRule])],
  controllers: [CompanionRulesController],
  providers: [CompanionRulesService],
})
export class CompanionRulesModule {}
