const Chat = require("../../models/Chat");
const Message = require("../../models/Message");
const User = require("../../models/user");
const { GraphQLError } = require("graphql");

const messageResolvers = {
  Query: {
    getMessageInfo: async (_, { messageId }, { req, res }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }
      try {
        const message = await Message.findOne({
          _id: messageId,
          sender: req.userId,
        }).populate({
          path: "sender",
          select: "-password -__v",
        });
        return message;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
  Mutation: {
    sendMessage: async (_, { messageInput }, { req, res, io }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      try {
        const { chatId, users, content } = messageInput;
        let chat;
        chat = await Chat.findById(chatId);
        if (!chat) {
          chat = new Chat({
            name: "private",
            users: [...users],
          });
          await chat.save();
        }

        const message = new Message({
          chatId: chat._id,
          sender: req.userId,
          content,
        });
        await message.save();
        await message.populate([
          {
            path: "sender",
            select: "-password -__v -refreshTokens",
          },
        ]);

        chat.lastMessage = message;
        chat.users.forEach((user) => {
          if (user.toString() !== req.userId) {
            chat.unreadMessagesCount.set(
              user.toString(),
              (chat.unreadMessagesCount.get(user.toString()) || 0) + 1
            );
          }
        });
        await chat.save();

        // Emit new message event to chat users
        chat.users.forEach((user) => {
          io.to(user.toString()).emit("newMessage", { message });
        });
        return message;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    markMessageAsSeen: async (_, { chatId }, { req, res }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      try {
        const userId = req.userId;

        const chat = await Chat.findById(chatId);

        if (!chat) {
          throw new GraphQLError("Chat not found", {
            extensions: { code: 404 },
          });
        }

        await Message.updateMany(
          { chatId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );

        chat.unreadMessagesCount.set(userId, 0);
        await chat.save();
        return "Messages marked as seen";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
};

module.exports = messageResolvers;
