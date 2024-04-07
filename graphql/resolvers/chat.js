const mongoose = require("mongoose");
const Chat = require("../../models/Chat");

const chatResolvers = {
  Query: {
    getUserChats: async (_, __, { req, res }) => {
      if (!req.isAuth) {
        const error = new Error(JSON.stringify({message: "Not authenticated", code: 401}));
        error.code = 401;
        throw error;
      }
      try {
        const { userId } = req;
        const userChats = await Chat.find({
          users: userId
        }).populate({ path: "users", select: "-password -__v" });

        return userChats;
      } catch (error) {
        throw new Error(error);
      }
    },
    getChatMessages: async (_, { chatId }, { req, res }) => {
      if (!req.isAuth) {
        const error = new Error("Not authenticated");
        error.code = 401;
        throw error;
      }
      try {
        const chat = await Chat.findById(chatId)
          .populate({
            path: "lastMessage",
            populate: { path: "sender", select: "-password -__v" },
          })
          .sort({ createdAt: -1 });

        if (chat.users.indexOf(req.userId) === -1) {
          const error = new Error("Not authorized");
          error.code = 403;
          throw error;
        }

        return chat.messages;
      } catch (error) {
        throw new Error(error);
      }
    },
  },
  Mutation: {
    createChat: async (_, { chatInput }, { req, res }) => {
      if (!req.isAuth) {
        const error = new Error("Not authenticated");
        error.code = 401;
        throw error;
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
        throw new Error(error);
      }
    },
  },
};

module.exports = chatResolvers;
