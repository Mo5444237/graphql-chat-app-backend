const { model } = require("mongoose");
const io = require("../../app.js");

const Message = require("../../models/Message");

const messageResolvers = {
  Query: {},
  Mutation: {
    sendMessage: async (_, { messageInput }, { req, res, io }) => {
      // if (!req.isAuth) {
      //     const error = new Error("Not authenticated");
      //     error.code = 401;
      //     throw error;
      // }
      console.log(messageInput);
      try {
        const { chat, content, sender } = messageInput;
        const message = new Message({
          chatId: chat,
          sender: sender,
          content,
        });
        await message.save();
        io.to(chat).emit("newMessage", {message});
        return message.populate({ path: "sender", select: "-password -__v" });
      } catch (error) {
        throw new Error(error);
      }
    },
  },
};

module.exports = messageResolvers;
