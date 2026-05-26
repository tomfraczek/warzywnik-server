import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VegetableSuggestion } from './vegetable-suggestion.entity';
import { VegetableSuggestionsService } from './vegetable-suggestions.service';
import {
  VegetableSuggestionsController,
  VegetableSuggestionsAdminController,
} from './vegetable-suggestions.controller';

@Module({
  imports: [MikroOrmModule.forFeature([VegetableSuggestion])],
  providers: [VegetableSuggestionsService],
  controllers: [
    VegetableSuggestionsController,
    VegetableSuggestionsAdminController,
  ],
})
export class VegetableSuggestionsModule {}
