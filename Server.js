require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Replace YOUR_API_TOKEN with the actual token from BotFather or use .env file for security.
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_API_TOKEN';
const bot = new TelegramBot(token, { polling: true });

// Listen for any kind of message
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Log the received message
  console.log(`Received message from ${chatId}: ${messageText}`);

  // Reply to the user
  bot.sendMessage(chatId, 'Thank you for your message!');
});
