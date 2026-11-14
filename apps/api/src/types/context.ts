import type { DataLoaders } from '../loaders';
import type { Response } from 'express';

export interface GraphQLContext {
  loaders: DataLoaders;
  teacherId: string | undefined;
  sessionToken: string | undefined;
  response: Response;
}
