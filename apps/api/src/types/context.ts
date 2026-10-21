import type { DataLoaders } from '../loaders';

export interface GraphQLContext {
  loaders: DataLoaders;
  teacherId: string | undefined;
}
