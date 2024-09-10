require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Replace with your actual bot token and admin chat ID (your Telegram user ID)
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_TELEGRAM_USER_ID; // Replace this with your own Telegram user ID (get it from @userinfobot)

const bot = new TelegramBot(token);
const port = process.env.PORT || 3000;
const webhookUrl = process.env.WEBHOOK_URL || 'https://mybot-production-7a35.up.railway.app'; // Replace with your deployed Railway URL

// Set the webhook to receive updates
bot.setWebHook(`${webhookUrl}/bot${token}`);

// Webhook endpoint
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Welcome message when /start is used
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  bot.sendMessage(chatId, `Hello ${firstName} 🖐🏿 Welcome to my Telegram bot. How can I assist you today?`);
});

// Handle messages and differentiate admin from users
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const firstName = msg.from.first_name;

  // Skip if it's the /start command
  if (messageText === '/start') return;

  // Thank-you message for all users
  bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');

  // Only show the reply option if the message is from the admin
  if (chatId === adminChatId) {
    // Log the message and show reply option only to the admin
    console.log(`Received message from ${firstName} (${chatId}): ${messageText}`);
    
    // Send the message with an inline reply option
    bot.sendMessage(adminChatId, `Message from ${firstName}: "${messageText}"`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Reply',
              callback_data: `reply_${chatId}`
            }
          ]
        ]
      }
    });
  }
});

// Handle inline reply from admin
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;

  // Ensure only the admin can reply
  if (chatId !== adminChatId) {
    bot.sendMessage(chatId, 'You are not authorized to use this function.');
    return;
  }

  // Extract the user chat ID from the callback data
  const targetChatId = callbackQuery.data.split('_')[1];

  // Ask the admin to type the reply
  bot.sendMessage(adminChatId, 'Please type your reply:');

  // Wait for the admin's reply and send it to the original user
  bot.once('message', (replyMsg) => {
    const replyText = replyMsg.text;

    // Send the admin's reply to the user
    bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);

    // Confirm to the admin that the reply was sent
    bot.sendMessage(adminChatId, 'Your reply has been sent.');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
