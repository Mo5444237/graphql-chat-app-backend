const { GraphQLError } = require("graphql");
const Chat = require("../models/Chat");

exports.findChatById = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);

  if (!chat || !chat.users.includes(userId)) {
    throw new GraphQLError("Not found", {
      extensions: { code: 404 },
    });
  }
  return chat;
};

exports.emitNewMessage = (io, chat, message) => {
  chat.users.forEach((user) => {
    io.to(user._id.toString()).emit("newMessage", {
      message,
      data: chat,
    });
  });
};
