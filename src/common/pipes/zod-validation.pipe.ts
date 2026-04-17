import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException(this.formatZodError(result.error));
    }

    return result.data;
  }

  private formatZodError(error: ZodError) {
    return (
      error.issues
        .map((i) => {
          const path = i.path.length ? `${i.path.join('.')}: ` : '';
          return `${path}${i.message}`;
        })
        .join(', ') || 'Validation error'
    );
  }
}
