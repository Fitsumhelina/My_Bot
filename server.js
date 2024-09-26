// index.js
require('dotenv').config();
const connectDB = require('./config/db');
const bot = require('./utils/bot');

// Connect to MongoDB
connectDB();

// Start the bot
bot.launch();

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
