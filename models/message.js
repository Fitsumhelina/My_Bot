// models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phone: String,
  tag: String,
  message: String,
  multimedia: [String],
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', MessageSchema);
