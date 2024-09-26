// models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  media: String,  // Handle media as URLs or file IDs
  sentBy: { type: String, enum: ['user', 'admin'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
