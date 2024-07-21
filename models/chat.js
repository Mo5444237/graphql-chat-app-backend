const mongoose = require("mongoose");
const { Schema } = mongoose;

const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    avatar: {
      type: String
    },
    unreadMessagesCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

chatSchema.index({ users: 1 });

module.exports = mongoose.model("Chat", chatSchema);
