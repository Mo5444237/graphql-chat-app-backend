const { GraphQLError } = require("graphql");
const Chat = require("../../models/Chat");
const Message = require("../../models/Message");

const chatResolvers = {
  Query: {
    getUserChats: async (_, __, { req, res }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }
      try {
        const { userId } = req;
        const userChats = await Chat.find({
          users: userId,
        })
          .populate([
            { path: "users", select: "-password -__v" },
            {
              path: "lastMessage",
              populate: {
                path: "sender",
                name: "name",
              },
            },
          ])
          .sort({
            lastMessage: -1,
          });

        const chats = userChats.map((chat) => {
          const chatName =
            chat.type === "private" &&
            chat.users.find((user) => user._id.toString() !== userId)?.name;

          const unreadMessagesCount = chat.unreadMessagesCount.get(userId) || 0;

          return {
            ...chat._doc,
            _id: chat._id.toString(),
            name: chat.type === "private" ? chatName : chat.name,
            unreadMessagesCount,
          };
        });
        return chats;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    getChatMessages: async (_, { chatId }, { req, res }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }
      try {
        const chat = await Chat.findById(chatId);

        if (chat.users.indexOf(req.userId) === -1) {
          throw new GraphQLError("Unauthorized", {
            extensions: { code: 403 },
          });
        }

        const chatMessage = await Message.find({ chatId: chatId })
          .sort({
            createdAt: 1,
          })
          .populate([
            {
              path: "sender",
              select: "name",
            },
            { path: "readBy", select: "name" },
          ]);
        return chatMessage;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
  Mutation: {
    createChat: async (_, { chatInput }, { req, res }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }
      try {
        const { users, name } = chatInput;
        let chatType = "private";
        if (users.length > 1) {
          chatType = "group";
        }
        const chat = new Chat({
          name,
          users: [...users, req.userId],
          type: chatType,
        });

        await chat.save();

        const data = await chat.populate([
          { path: "users", select: "-password -__v" },
        ]);
        return data;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
};

module.exports = chatResolvers;
