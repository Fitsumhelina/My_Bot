require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Replace with your actual bot token and admin chat ID (your Telegram user ID)
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_TELEGRAM_USER_ID; // Your Telegram user ID (get it from @userinfobot)

const bot = new TelegramBot(token);
const port = process.env.PORT || 3000;
const webhookUrl = process.env.WEBHOOK_URL; // Replace with your deployed Railway URL

// Set the webhook to receive updates
bot.setWebHook(`${webhookUrl}/bot${token}`);

// Webhook endpoint to receive Telegram updates
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Show a welcome message when a user starts the bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'there';
  if (chatId !== adminChatId) {
    bot.sendMessage(chatId, `Hello ${firstName} 🖐🏿! Welcome to my Telegram bot. How can I assist you today?`);
  } else {
    bot.sendMessage(chatId, `Hello Boss`);
  }
});

// Handle incoming messages from users
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const firstName = msg.from.first_name || 'there';
  const username = msg.from.username || 'No username';

  // Ignore the /start command
  if (messageText === '/start') return;

  // Send thank you message to the user
  if (chatId !== adminChatId) {
    bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');
  } else {
    bot.sendMessage(chatId, `Hello Boss, please select reply first.`);
  }

  // Show the message details to the admin (you) and add a reply button
  if (chatId !== adminChatId) {
    const userFullName = `${msg.from.first_name} ${msg.from.last_name}`;
    const messageDetails = `Message from ${userFullName} (@${username}): "${messageText}"`;

    // Send the message details to the admin along with the reply button
    bot.sendMessage(adminChatId, messageDetails, {
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

// Handle the admin's reply to a specific user
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  // Extract the user chat ID from the callback data
  const targetChatId = callbackQuery.data.split('_')[1];

  // Ask the admin to type their reply
  bot.sendMessage(adminChatId, 'Please type your reply:').then((sentMessage) => {
    const replyPromptMessageId = sentMessage.message_id; // Get the message ID of the "Please type your reply" message

    // Listen for the admin's reply and send it to the user
    bot.once('message', (replyMsg) => {
      const replyText = replyMsg.text;

      // Send the admin's reply to the user
      bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);

      // Confirm to the admin that the reply has been sent
      bot.sendMessage(adminChatId, 'Your reply has been sent.');

      // Delete the "Please type your reply" message after the admin submits the reply
      bot.deleteMessage(adminChatId, replyPromptMessageId).catch(err => console.log('Failed to delete message', err));

    });
  });

  // Remove the inline keyboard after it's used
  bot.editMessageReplyMarkup({}, {
    chat_id: adminChatId,
    message_id: messageId
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
