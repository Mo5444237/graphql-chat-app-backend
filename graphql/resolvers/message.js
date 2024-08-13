const checkBlocked = require("../../middlewares/checkBlocked");
const { uploadSingleFile } = require("../../middlewares/upload-images");
const Chat = require("../../models/chat");
const Message = require("../../models/message");
const { GraphQLError } = require("graphql");
const { isAuthenticated } = require("../../utils/auth");
const { findChatById } = require("../../utils/chat");

const messageResolvers = {
  Query: {
    getMessageInfo: async (_, { messageId }, { req, res }) => {
      isAuthenticated(req);

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
      isAuthenticated(req);

      try {
        const { chatId, users, content, caption, type, image, createdAt } =
          messageInput;

        let chat;
        let isFirstMessage;
        chat = await Chat.findById(chatId);

        if (!chat) {
          isFirstMessage = true;
          chat = new Chat({
            name: "private",
            users: [...users],
          });
          await chat.save();
        }

        let imageUrl;
        if (type === "image") {
          imageUrl = await uploadSingleFile(image, "chat-messages");
        }

        let isBlocked;
        if (chat && chat.type === "private") {
          const senderId = req.userId;
          const receiverId = chat.users.filter(
            (id) => id.toString() !== senderId
          )[0];
          isBlocked = await checkBlocked(senderId, receiverId);
        }

        const message = new Message({
          chatId: chat._id,
          sender: req.userId,
          content: imageUrl || content,
          type,
          caption,
          createdAt,
          delivered: !isBlocked,
        });
        await message.save();

        await message.populate([
          {
            path: "sender",
            select: "-password -__v -refreshTokens",
          },
        ]);

        await chat.populate([
          {
            path: "users",
            select: "_id name avatar",
          },
        ]);

        if (!isBlocked) {
          chat.lastMessage = message;
        }

        chat.users.forEach((user) => {
          const privateAndBlockedChat = chat.type === "private" && isBlocked;
          if (user._id.toString() !== req.userId && !privateAndBlockedChat) {
            chat.unreadMessagesCount.set(
              user._id.toString(),
              (chat.unreadMessagesCount.get(user._id.toString()) || 0) + 1
            );
          }
          // Emit new message event to chat users
          if (!isBlocked || user._id.toString() === req.userId) {
            io.to(user._id.toString()).emit("newMessage", {
              message,
              data: isFirstMessage ? chat : null,
            });
          }
        });
        await chat.save();

        return message;
      } catch (error) {
        return new GraphQLError(error);
      }
    },
    markMessageAsSeen: async (_, { chatId }, { req, res }) => {
      isAuthenticated(req);

      try {
        const userId = req.userId;

        const chat = await findChatById(chatId, userId);

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
