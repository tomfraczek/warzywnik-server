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
import { ArticlesService } from './articles.service';
import {
  createArticleSchema,
  listArticlesQuerySchema,
  updateArticleSchema,
  CreateArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './dto/article.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('v1/articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listArticlesQuerySchema))
    query: ListArticlesQueryDto,
  ) {
    return this.articlesService.listPublic(query);
  }

  @Get(':idOrSlug')
  get(@Param('idOrSlug') idOrSlug: string) {
    return this.articlesService.getPublicByIdOrSlug(idOrSlug);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createArticleSchema))
    body: CreateArticleDto,
  ) {
    return this.articlesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateArticleSchema))
    body: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.articlesService.remove(id);
  }
}
