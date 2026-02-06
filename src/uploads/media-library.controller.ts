import { Controller, Get, Query } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';
import {
  MediaLibraryQueryDto,
  mediaLibraryQuerySchema,
} from './dto/media-library.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

type R2ListResponse = {
  items: Array<{ key: string; size?: number; lastModified?: Date }>;
  nextCursor?: string;
};

@Controller('v1/media-library')
export class MediaLibraryController {
  constructor(private readonly r2Storage: R2StorageService) {}

  @Get('vegetables')
  listVegetableImages(
    @Query(new ZodValidationPipe(mediaLibraryQuerySchema))
    query: MediaLibraryQueryDto,
  ) {
    return this.listByPrefix('vegetables/', query);
  }

  @Get('articles')
  listArticleImages(
    @Query(new ZodValidationPipe(mediaLibraryQuerySchema))
    query: MediaLibraryQueryDto,
  ) {
    return this.listByPrefix('articles/', query);
  }

  private async listByPrefix(prefix: string, query: MediaLibraryQueryDto) {
    const response = await (
      this.r2Storage as unknown as {
        listObjects: (params: {
          prefix: string;
          limit?: number;
          cursor?: string;
        }) => Promise<R2ListResponse>;
      }
    ).listObjects({
      prefix,
      limit: query.limit,
      cursor: query.cursor,
    });

    const { items, nextCursor } = response;

    return {
      items: items.map((item) => {
        const fileName = item.key.split('/').pop() ?? item.key;
        return {
          key: item.key,
          publicUrl: this.r2Storage.getPublicUrl(item.key),
          fileName,
          size: item.size ?? null,
          lastModified: item.lastModified
            ? item.lastModified.toISOString()
            : null,
        };
      }),
      limit: query.limit,
      nextCursor: nextCursor ?? null,
    };
  }
}
