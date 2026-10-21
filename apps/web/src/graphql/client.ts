import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
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
  headers: {
    // Teacher auth header — set after login flow (Phase 5 uses a seed teacher ID)
    'x-teacher-id': localStorage.getItem('teacherId') ?? '',
  },
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Student: { keyFields: ['id'] },
      ReportComment: { keyFields: ['id'] },
      GenerationJob: { keyFields: ['id'] },
    },
  }),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
});
