// services/messageService.js
const ChatHistory = require('../models/ChatHistory');

const saveChatMessage = async (chatId, from, content) => {
  await ChatHistory.updateOne(
    { chatId },
    { $push: { messages: { from, content, timestamp: new Date() } } },
    { upsert: true }
  );
};

const getRecentMessages = async (chatId, limit = 6) => {
  const chatHistory = await ChatHistory.findOne({ chatId });
  if (!chatHistory || !chatHistory.messages) return 'No previous chat history.';
  
  const recentMessages = chatHistory.messages.slice(-limit);
  return recentMessages.map((msg) => `${msg.from === 'user' ? 'user' : 'admin'}: ${msg.content}`).join('\n');
};

module.exports = { saveChatMessage, getRecentMessages };
