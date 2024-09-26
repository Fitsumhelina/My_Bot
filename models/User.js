// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  blocked: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
