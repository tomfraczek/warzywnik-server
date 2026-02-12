import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto, searchQuerySchema } from './dto/search.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQueryDto,
  ): ReturnType<SearchService['search']> {
    return this.searchService.search(query);
  }
}
