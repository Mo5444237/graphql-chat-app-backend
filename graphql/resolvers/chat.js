const { GraphQLError } = require("graphql");
const Chat = require("../../models/Chat");
const Message = require("../../models/message");
const User = require("../../models/user");
const { uploadSingleFile } = require("../../middlewares/upload-images");

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
            { path: "users", select: "-password -refreshTokens -__v" },
            {
              path: "lastMessage",
              populate: {
                path: "sender",
                select: "-password -refreshTokens -__v",
              },
            },
          ])
          .sort({
            lastMessage: -1,
          });

        const chats = userChats.map((chat) => {
          const { name, avatar } =
            chat.type === "private" &&
            chat.users.find((user) => user._id.toString() !== userId);

          const unreadMessagesCount = chat.unreadMessagesCount.get(userId) || 0;
          return {
            ...chat._doc,
            _id: chat._id.toString(),
            avatar: chat.type === "private" ? avatar : chat.avatar,
            name: chat.type === "private" ? name : chat.name,
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
    createChat: async (_, { chatInput }, { req, res, io }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }
      try {
        const { users, name } = chatInput;
        const userId = req.userId;
        const user = await User.findById(userId);

        const chat = new Chat({
          name,
          users: [...users, userId],
          type: "group",
          admin: userId,
        });

        await chat.save();

        const message = new Message({
          chatId: chat._id,
          sender: userId,
          content: `Created By ${user.name}`,
          type: "event",
        });
        await message.save();

        chat.lastMessage = message;
        await chat.save();

        chat.users.forEach((user) => {
          io.to(user.toString()).emit("newMessage", {
            message,
          });
        });

        const data = await chat.populate([
          { path: "users", select: "-password -refreshTokens -__v" },
          {
            path: "lastMessage",
            populate: {
              path: "sender",
              select: "-password -refreshTokens -__v",
            },
          },
        ]);
        return data;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    editChat: async (_, { chatInput }, { req, res, io }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }
      const userId = req.userId;
      const { name, avatar, chatId } = chatInput;
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || chat.admin.toString() !== userId) {
          throw new GraphQLError("Un-authorized", {
            extensions: { code: 403 },
          });
        }

        chat.name = name;

        if (avatar) {
          const imageUrl = await uploadSingleFile(avatar, "chat-app");
          chat.avatar = imageUrl;
        }
        await chat.save();
        await chat.populate([
          { path: "users", select: "-password -refreshTokens -__v" },
          {
            path: "lastMessage",
            populate: {
              path: "sender",
              select: "-password -refreshTokens -__v",
            },
          },
        ]);
        chat.users.forEach((user) => {
          io.to(user.toString()).emit("chatUpdate", { chat });
        });
        return chat;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    addUserToChat: async (_, { chatInput }, { req, res, io }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      const { chatId, userId } = chatInput;
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || chat.admin.toString() !== req.userId) {
          throw new GraphQLError("Un-authorized", {
            extensions: { code: 403 },
          });
        }

        const user = await User.findById(userId);
        if (!user) {
          throw new GraphQLError("User Not Found", {
            extensions: { code: 404 },
          });
        }

        chat.users.push(user._id.toString());

        const message = new Message({
          chatId: chat._id,
          sender: userId,
          content: `${user.email} Joined group`,
          type: "event",
        });
        await message.save();

        chat.lastMessage = message;
        await chat.save();

        chat.users.forEach((user) => {
          io.to(user.toString()).emit("newMessage", {
            message,
          });
        });
        return "User Added Successfully";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    deleteUserFromChat: async (_, { chatInput }, { req, res, io }) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: 401 },
        });
      }

      const { chatId, userId } = chatInput;
      try {
        const user = await User.findById(userId);

        if (!user) {
          throw new GraphQLError("User Not Found", {
            extensions: { code: 404 },
          });
        }

        const chat = await Chat.findById(chatId);
        if (!chat || chat.admin.toString() !== req.userId) {
          throw new GraphQLError("Un-authorized", {
            extensions: { code: 403 },
          });
        }

        await chat.updateOne({
          $pull: { users: userId },
        });

        const message = new Message({
          chatId: chat._id,
          sender: userId,
          content: `${user.email} Was removed from the group`,
          type: "event",
        });
        await message.save();

        chat.lastMessage = message;
        await chat.save();
        return "User Deleted Successfully";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
};

module.exports = chatResolvers;
