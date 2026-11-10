import { BadRequestException } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import { ArgumentMetadata } from '@nestjs/common/interfaces/features/pipe-transform.interface';
import { ZodValidationPipe } from './validation.pipe';
// Simple schema for testing
const testSchema = z.object({
  username: z.string().min(3),
  age: z.number().min(18),
});

let pipe: ZodValidationPipe;
const mockMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: Object,
  data: '',
};

describe('ZodValidationPipe', () => {
  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  describe('Successful Validation', () => {
    it('should return validated data when input is valid', () => {
      const validData = { username: 'testuser', age: 20 };
      const result = pipe.transform(validData, mockMetadata);
      expect(result).toEqual(validData);
    });

    it('should strip unknown properties', () => {
      const input = { username: 'testuser', age: 20, extra: 'property' };
      const result = pipe.transform(input, mockMetadata);
      expect(result).toEqual({ username: 'testuser', age: 20 });
    });
  });

  describe('Validation Errors', () => {
    it('should throw Error with ZodError messages when validation fails', () => {
      const invalidData = { username: 'ab', age: 15 }; // Both fields invalid
      expect(() => pipe.transform(invalidData, mockMetadata)).toThrowError(
        'Validation failed with the following errors: ' +
          'username: String must contain at least 3 character(s). ' +
          'age: Number must be greater than or equal to 18',
      );
    });

    it('should include all validation errors in the message', () => {
      const invalidData = { username: 'ab', age: 'not a number' };
      try {
        pipe.transform(invalidData, mockMetadata);
      } catch (error) {
        expect(error.message).toContain(
          'String must contain at least 3 character(s)',
        );
        expect(error.message).toContain('Expected number, received string');
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw generic Error for non-Zod errors', () => {
      const errorThrowingSchema = {
        parse: () => {
          throw new BadRequestException('Some random error');
        },
      } as unknown as ZodSchema;

      const errorPipe = new ZodValidationPipe(errorThrowingSchema);
      expect(() => errorPipe.transform({}, mockMetadata)).toThrow(Error);
      expect(() => errorPipe.transform({}, mockMetadata)).toThrow(
        'Something went wrong in the validation process.',
      );
    });

    it('should throw Error for non-Zod errors', () => {
      // Create a pipe with a schema that will throw a non-Zod error
      const errorThrowingSchema = {
        parse: () => {
          throw new Error('Some random error');
        },
      } as unknown as ZodSchema;

      const errorPipe = new ZodValidationPipe(errorThrowingSchema);
      expect(() => errorPipe.transform({}, mockMetadata)).toThrow(Error);
    });

    it('should include "Something went wrong" message for non-Zod errors', () => {
      const errorThrowingSchema = {
        parse: () => {
          throw new Error('Some random error');
        },
      } as unknown as ZodSchema;

      const errorPipe = new ZodValidationPipe(errorThrowingSchema);
      expect(() => errorPipe.transform({}, mockMetadata)).toThrowError(
        'Something went wrong in the validation process.',
      );
    });
  });

  describe('Metadata Handling', () => {
    it('should work with different metadata types', () => {
      const testCases: ArgumentMetadata[] = [
        { type: 'body', metatype: Object, data: '' },
        { type: 'query', metatype: String, data: 'param' },
        { type: 'param', metatype: Number, data: 'id' },
        { type: 'custom', metatype: Boolean, data: 'flag' },
      ];

      testCases.forEach((metadata) => {
        const validData = { username: 'testuser', age: 20 };
        expect(() => pipe.transform(validData, metadata)).not.toThrow();
      });
    });
  });

  describe('Schema Switching', () => {
    it('should validate against the provided schema', () => {
      const emailSchema = z.object({
        email: z.string().email(),
      });
      const emailPipe = new ZodValidationPipe(emailSchema);

      const validEmail = { email: 'test@example.com' };
      expect(emailPipe.transform(validEmail, mockMetadata)).toEqual(validEmail);

      const invalidEmail = { email: 'not-an-email' };
      expect(() => emailPipe.transform(invalidEmail, mockMetadata)).toThrow();
    });
  });
});
