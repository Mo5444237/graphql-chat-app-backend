const authResolvers = require("./resolvers/auth");
const chatResolvers = require("./resolvers/chat");
const messageResolvers = require("./resolvers/message");

const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...chatResolvers.Query,
    ...messageResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...chatResolvers.Mutation,
    ...messageResolvers.Mutation,
  },
};

module.exports = resolvers;
