// models/ChatHistory.js
const mongoose = require('mongoose');

const ChatHistorySchema = new mongoose.Schema({
  chatId: String,
  messages: [
    {
      from: String,
      content: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model('ChatHistory', ChatHistorySchema);
