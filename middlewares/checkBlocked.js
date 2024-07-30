const User = require("../models/user");

module.exports = async (senderId, receiverId) => {
  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);

  return (
    receiver.blockedUsers.includes(senderId) ||
    sender.blockedUsers.includes(receiverId)
  );
};
