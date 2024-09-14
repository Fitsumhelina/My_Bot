// models/Question.js
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  userId: String,
  question: String,
  multimedia: [String],
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Question', QuestionSchema);
