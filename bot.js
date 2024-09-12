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

// In-memory storage for blocked users and chat history
const blockedUsers = new Set();
const chatHistory = {};

// Set the webhook to receive updates
bot.setWebHook(`${webhookUrl}/bot${token}`);

// Webhook endpoint to receive Telegram updates
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Function to store chat history
const storeChatHistory = (chatId, message) => {
  if (!chatHistory[chatId]) {
    chatHistory[chatId] = [];
  }
  chatHistory[chatId].push(message);
  if (chatHistory[chatId].length > 5) {
    chatHistory[chatId].shift(); // Keep only the recent 5 messages
  }
};

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

  // Check if the user is blocked
  if (blockedUsers.has(chatId)) {
    bot.sendMessage(chatId, 'You are blocked and cannot send messages.');
    return;
  }

  // Store the chat history
  storeChatHistory(chatId, messageText);

  // Send thank you message to the user
  if (chatId !== adminChatId) {
    bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');

    // Prepare message details for the admin
    const userFullName = `${msg.from.first_name} ${msg.from.last_name}`;
    const recentChatHistory = chatHistory[chatId].join('\n');
    const messageDetails = `Full name: ${userFullName}\nUsername: @${username}\nRecent chat history:\n${recentChatHistory}`;

    // Send the message details to the admin along with reply and block buttons
    bot.sendMessage(adminChatId, messageDetails, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Reply', callback_data: `reply_${chatId}` },
            { text: 'Block', callback_data: `block_${chatId}` }
          ]
        ]
      }
    });
  } else {
    // Show admin's message as a user message (with Reply and Block options)
    const adminMessage = `Admin sent a message: "${messageText}"`;
    bot.sendMessage(adminChatId, adminMessage, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Reply', callback_data: `reply_${chatId}` },
            { text: 'Block', callback_data: `block_${chatId}` }
          ]
        ]
      }
    });
  }
});

// Handle the admin's actions (reply or block)
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  const [action, targetChatId] = callbackQuery.data.split('_');

  if (action === 'reply') {
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
  } else if (action === 'block') {
    // Block the user
    blockedUsers.add(targetChatId);
    bot.sendMessage(adminChatId, `User @${targetChatId} has been blocked.`);
  }

  // Remove the inline keyboard after the action is taken
  bot.editMessageReplyMarkup({}, {
    chat_id: adminChatId,
    message_id: messageId
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
