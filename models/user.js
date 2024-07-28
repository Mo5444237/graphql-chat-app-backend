const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  online: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now(),
  },
  refreshTokens: [
    {
      token: String,
    },
  ],
  contacts: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      name: {
        type: String,
      },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
