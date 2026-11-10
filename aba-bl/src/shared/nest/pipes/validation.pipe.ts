import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema<any>) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: unknown, _: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors
          .map((e) => e.path[0] + ': ' + e.message)
          .join('. ');
        throw new BadRequestException(
          `Validation failed with the following errors: ${errorMessages}`,
        );
      }
      throw new Error('Something went wrong in the validation process.');
    }
  }
}
