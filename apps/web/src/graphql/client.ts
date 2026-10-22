import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      console.error(`[GraphQL error] ${err.extensions?.['code'] ?? ''}: ${err.message}`);
    }
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError.message}`);
  }
});

const graphqlUri =
  (typeof process !== 'undefined' && process.env?.['REACT_APP_GRAPHQL_URL']) || '/graphql';

const httpLink = createHttpLink({
  uri: graphqlUri,
});

const authLink = setContext((_, { headers }) => {
  const teacherId = typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null;
  return {
    headers: {
      ...headers,
      ...(teacherId ? { 'x-teacher-id': teacherId } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Student: { keyFields: ['id'] },
      ReportComment: { keyFields: ['id'] },
      GenerationJob: { keyFields: ['id'] },
      Class: { keyFields: ['id'] },
      Teacher: { keyFields: ['id'] },
    },
  }),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
});
