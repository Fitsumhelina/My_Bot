// controllers/adminController.js
const User = require('../models/User');
const Message = require('../models/Message');

const getRecentChatHistory = async (userId) => {
  return await Message.find({ sender: userId }).sort({ timestamp: -1 }).limit(5);
};

const replyToUser = async (ctx, userId, replyText) => {
  const user = await User.findById(userId);

  if (!user) {
    return ctx.reply("User not found.");
  }

  const replyMessage = new Message({
    sender: user._id,
    text: replyText,
    sentBy: 'admin',
  });

  await replyMessage.save();
  ctx.telegram.sendMessage(user.telegramId, replyText);
  ctx.reply("Message sent to the user.");
};

const blockUser = async (ctx, userId) => {
  await User.findByIdAndUpdate(userId, { blocked: true });
  ctx.reply("User blocked.");
};

module.exports = { getRecentChatHistory, replyToUser, blockUser };
