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
        const currentUser = await User.findById(req.userId).populate({
          path: "contacts.userId",
          select: "name avatar",
        });
        let contacts = currentUser.contacts;
        contacts = contacts.map((contact) => {
          return { ...contact.userId._doc, name: contact.name };
        });
        return contacts;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
  Mutation: {
    addContact: async (_, { contactInput }, { req }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      try {
        const { email, name } = contactInput;
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
        const contactExists = currentUser.contacts.some((contact) =>
          contact.userId.equals(newContact._id)
        );
        if (contactExists) {
          throw new GraphQLError("Contact already exists", {
            extensions: { code: 400 },
          });
        }
        currentUser.contacts.push({
          userId: newContact._id,
          name: name || newContact.name,
        });
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
    editContact: async (_, { contactInput }, { req }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      try {
        const userId = req.userId;
        const { contactId, name } = contactInput;
        const updatedContact = await User.updateOne(
          {
            _id: userId,
            "contacts.userId": contactId,
          },
          { $set: { "contacts.$.name": name } }
        );
        if (!updatedContact.matchedCount) {
          throw new GraphQLError("Contact not found", {
            extensions: { code: 404 },
          });
        }
        return "Contact Updated Successfully";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
};

module.exports = contactResolvers;
