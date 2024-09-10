require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// Replace YOUR_API_TOKEN with the actual token from BotFather or use .env file for security.
const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.SERVER_URL; // This will be set in Railway environment variables

const bot = new TelegramBot(token);
const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

// Define webhook route
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Send a welcome message when the bot is started (/start command)
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  // Welcome message
  bot.sendMessage(chatId, `Hello ${firstName} 🖐🏿 Welcome to my Telegram bot. How can I assist you today?`);
});

// Listen for any kind of message after the /start command
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Make sure to not reply with the message if it's the /start command
  if (messageText === '/start') return;

  // Log the received message
  console.log(`Received message from ${chatId}: ${messageText}`);

  // Reply to the user with the custom message
  bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');
});

// Set webhook URL for Telegram
bot.setWebHook(`${url}/bot${token}`);

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
