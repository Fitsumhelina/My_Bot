const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  chatId: String,
  name: String,
  phoneNumber: String,
  username: String,
  blocked: { type: Boolean, default: false },
  tags: [String], 
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
});

module.exports = mongoose.model('User', userSchema);
