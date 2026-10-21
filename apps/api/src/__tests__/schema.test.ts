import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../schema/typeDefs';
import { resolvers } from '../resolvers';

describe('GraphQL Schema & Resolvers', () => {
  it('creates an executable schema without syntax or type errors', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    expect(schema).toBeDefined();

    const queryType = schema.getQueryType();
    expect(queryType).toBeDefined();

    const fields = queryType!.getFields();
    expect(fields['classRoster']).toBeDefined();
    expect(fields['studentEvidence']).toBeDefined();
    expect(fields['reportComment']).toBeDefined();
    expect(fields['timeSavedSummary']).toBeDefined();
    expect(fields['generationJob']).toBeDefined();
    expect(fields['me']).toBeDefined();
    expect(fields['classes']).toBeDefined();
  });

  it('contains expected mutations for teacher comment copilot workflows', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const mutationType = schema.getMutationType();
    expect(mutationType).toBeDefined();

    const fields = mutationType!.getFields();
    expect(fields['generateComments']).toBeDefined();
    expect(fields['updateComment']).toBeDefined();
    expect(fields['approveComment']).toBeDefined();
    expect(fields['addObservation']).toBeDefined();
    expect(fields['logManualTime']).toBeDefined();
    expect(fields['regenerateComment']).toBeDefined();
  });
});
