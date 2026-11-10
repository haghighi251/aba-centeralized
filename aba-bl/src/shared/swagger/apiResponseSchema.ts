import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Wraps a data schema in the common `{ success, error, data }` envelope
 * produced by `createResponse()`, for use in `@ApiResponse({ schema })`.
 */
export function apiResponseSchema(data: SchemaObject): SchemaObject {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      error: { type: 'string', nullable: true },
      data,
    },
  };
}

export const apiErrorResponseSchema: SchemaObject = apiResponseSchema({
  type: 'object',
  nullable: true,
});
