const { GraphQLError } = require("graphql");
const User = require("../../models/user");

const contactResolvers = {
  Query: {
    getContacts: async (_, __, { req }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      try {
        const currentUser = await User.findById(req.userId).populate([
          {
            path: "contacts",
            select: "-password -__V -refreshTokens",
          },
        ]);
        const contacts = currentUser.contacts;
        return contacts;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
  Mutation: {
    addContact: async (_, { email }, { req }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      try {
        const newContact = await User.findOne({
          email: email,
          _id: { $ne: req.userId },
        });
        if (!newContact) {
          throw new GraphQLError("User not found", {
            extensions: { code: 404 },
          });
        }
        const currentUser = await User.findById(req.userId);
        if (currentUser.contacts.includes(newContact._id.toString())) {
          throw new GraphQLError("Contact already exists", {
            extensions: { code: 400 },
          });
        }
        currentUser.contacts.push(newContact._id);
        await currentUser.save();
        return "New contact was added.";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    deleteContact: async (_, { userId }, { req }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      try {
        const currentUser = await User.findById(req.userId);
        currentUser.contacts = currentUser.contacts.filter(
          (contact) => contact._id.toString() !== userId
        );
        await currentUser.save();
        return "Contact was deleted successfully.";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
};

module.exports = contactResolvers;
