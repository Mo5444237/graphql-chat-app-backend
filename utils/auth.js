const { GraphQLError } = require("graphql");

exports.isAuthenticated = (req) => {
  if (!req.isAuth) {
    throw new GraphQLError("Not authenticated", {
      extensions: { code: 401 },
    });
  }
};
