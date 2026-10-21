import { GraphQLError } from 'graphql';
import type { ZodError } from 'zod';

/**
 * Converts a Zod validation error into a GraphQL BAD_USER_INPUT error.
 * Keeps error messages readable for the client.
 */
export function toGraphQLError(zodError: ZodError): GraphQLError {
  const messages = zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
  return new GraphQLError(`Validation failed: ${messages}`, {
    extensions: { code: 'BAD_USER_INPUT', details: zodError.errors },
  });
}
