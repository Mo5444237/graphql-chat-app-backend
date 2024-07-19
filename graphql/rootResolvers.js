const { GraphQLUpload } = require("graphql-upload");
const authResolvers = require("./resolvers/auth");
const chatResolvers = require("./resolvers/chat");
const contactResolvers = require("./resolvers/contact");
const messageResolvers = require("./resolvers/message");

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    ...authResolvers.Query,
    ...chatResolvers.Query,
    ...messageResolvers.Query,
    ...contactResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...chatResolvers.Mutation,
    ...messageResolvers.Mutation,
    ...contactResolvers.Mutation,
  },
};

module.exports = resolvers;
