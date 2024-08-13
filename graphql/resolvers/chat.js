const { GraphQLError } = require("graphql");
const Chat = require("../../models/chat");
const Message = require("../../models/message");
const User = require("../../models/user");
const { uploadSingleFile } = require("../../middlewares/upload-images");
const checkBlocked = require("../../middlewares/checkBlocked");
const { isAuthenticated } = require("../../utils/auth");
const { findChatById, emitNewMessage } = require("../../utils/chat");

const chatResolvers = {
  Query: {
    getUserChats: async (_, __, { req, res }) => {
      isAuthenticated(req);

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

        const chats = userChats.map(async (chat) => {
          let { _id, name, avatar } =
            chat.type === "private" &&
            chat.users.find((user) => user._id.toString() !== userId);

          const isBlocked =
            chat.type === "private" &&
            (await checkBlocked(userId, _id.toString()));

          if (isBlocked) {
            avatar = null;
          }

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
      isAuthenticated(req);
      try {
        const chat = await findChatById(chatId, req.userId);

        const chatMessages = await Message.find({
          chatId: chatId,
          $or: [{ delivered: true }, { sender: req.userId }],
        })
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

        return chatMessages;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    getChatMedia: async (_, { chatId }, { req }) => {
      isAuthenticated(req);
      try {
        const chat = await findChatById(chatId, req.userId);

        const media = await Message.find({
          chatId: chatId,
          type: "image",
          $or: [{ delivered: true }, { sender: req.userId }],
        })
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

        return media;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
  Mutation: {
    createChat: async (_, { chatInput }, { req, res, io }) => {
      isAuthenticated(req);

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

        await message.populate([
          {
            path: "sender",
            select: "-password -refreshTokens -__v",
          },
        ]);

        emitNewMessage(io, chat, message);

        return data;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    editChat: async (_, { chatInput }, { req, res, io }) => {
      isAuthenticated(req);

      try {
        const userId = req.userId;
        const { name, avatar, chatId } = chatInput;

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

        const message = new Message({
          chatId: chat._id,
          sender: chat.admin,
          content: "Chat info was updated",
          type: "event",
        });

        await message.save();

        chat.lastMessage = message;
        await chat.save();

        await message.populate([
          {
            path: "sender",
            select: "-password -refreshTokens -__v",
          },
        ]);

        emitNewMessage(io, chat, message);

        return chat;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    addUsersToChat: async (_, { chatInput }, { req, res, io }) => {
      isAuthenticated(req);

      try {
        const { chatId, userIds } = chatInput;

        const chat = await Chat.findById(chatId);

        if (!chat || chat.admin.toString() !== req.userId) {
          throw new GraphQLError("Un-authorized", {
            extensions: { code: 403 },
          });
        }

        const users = await User.find({ _id: { $in: userIds } });

        if (users.length !== userIds.length) {
          throw new GraphQLError("Some Users Not Found", {
            extensions: { code: 404 },
          });
        }

        users.forEach((user) => {
          if (!chat.users.includes(user._id.toString())) {
            chat.users.push(user._id.toString());
          }
        });

        const messageContents = users
          .map((user) => `${user.email} joined the group`)
          .join(", ");

        const message = new Message({
          chatId: chat._id,
          sender: chat.admin,
          content: messageContents,
          type: "event",
        });

        await message.save();

        chat.lastMessage = message;
        await chat.save();

        await message.populate([
          {
            path: "sender",
            select: "-password -refreshTokens -__v",
          },
        ]);

        await chat.populate([
          {
            path: "users",
            select: "_id name avatar",
          },
        ]);

        emitNewMessage(io, chat, message);

        return "Users Added Successfully";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    deleteUserFromChat: async (_, { chatInput }, { req, res, io }) => {
      isAuthenticated(req);

      try {
        const { chatId, userId } = chatInput;

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

        if (!chat.users.includes(userId)) {
          throw new GraphQLError("User is not part of this chat", {
            extensions: { code: 400 },
          });
        }

        await chat.users.pull(userId);

        const message = new Message({
          chatId: chat._id,
          sender: chat.admin,
          content: `${user.email} Was removed from the group`,
          type: "event",
        });

        await message.save();

        chat.lastMessage = message;
        await chat.save();

        await message.populate([
          {
            path: "sender",
            select: "-password -refreshTokens -__v",
          },
        ]);

        await chat.populate({
          path: "users",
          select: "_id name avatar",
        });

        emitNewMessage(io, chat, message);

        return "User Deleted Successfully";
      } catch (error) {
        return new GraphQLError(error);
      }
    },
  },
};

module.exports = chatResolvers;
