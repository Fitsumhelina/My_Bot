require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

// Initialize MongoDB client
const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);
let db;

// Initialize Express and body-parser
const app = express();
app.use(bodyParser.json());

// Replace with your actual bot token and admin chat ID
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_TELEGRAM_USER_ID;

const bot = new TelegramBot(token);
const port = process.env.PORT || 3000;
const webhookUrl = process.env.WEBHOOK_URL;

// Set the webhook to receive updates
bot.setWebHook(`${webhookUrl}/bot${token}`);

// Webhook endpoint to receive Telegram updates
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Connect to MongoDB and initialize the database
client.connect().then(() => {
  db = client.db('telegramBot');
  console.log('Connected to MongoDB');
});

// Utility to get chat history
async function getChatHistory(chatId, limit = 5) {
  const messages = await db.collection('messages').find({ chatId }).sort({ timestamp: -1 }).limit(limit).toArray();
  return messages.reverse();
}

// Utility to block a user
async function blockUser(userId) {
  await db.collection('blockedUsers').updateOne({ userId }, { $set: { userId } }, { upsert: true });
}

// Utility to unblock a user
async function unblockUser(userId) {
  await db.collection('blockedUsers').deleteOne({ userId });
}

// Check if a user is blocked
async function isUserBlocked(userId) {
  const blockedUser = await db.collection('blockedUsers').findOne({ userId });
  return !!blockedUser;
}

// Welcome message when the user starts the bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'there';
  if (chatId !== adminChatId) {
    bot.sendMessage(chatId, `Hello ${firstName}! Welcome to my Telegram bot. How can I assist you today?`);
  } else {
    bot.sendMessage(chatId, `Hello Boss`);
  }
});

// Handle incoming messages from users
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const userId = msg.from.id;

  if (messageText === '/start') return; // Ignore the /start command

  // Check if the user is blocked
  if (await isUserBlocked(userId)) {
    bot.sendMessage(chatId, "You are blocked from sending messages.");
    return;
  }

  // User messages (non-admin)
  if (chatId !== adminChatId) {
    // Save the user message to MongoDB
    await db.collection('messages').insertOne({
      chatId,
      userId,
      text: messageText,
      from: 'user',
      timestamp: new Date()
    });

    const chatHistory = await getChatHistory(chatId);
    const messageDetails = chatHistory.map(msg => `${msg.from === 'user' ? 'user' : 'admin'}: ${msg.text}`).join('\n');

    // Notify the admin about the new message with chat history
    bot.sendMessage(adminChatId, `Message from ${msg.from.first_name} (@${msg.from.username}): "${messageText}"\n\nRecent chat history:\n${messageDetails}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Reply', callback_data: `reply_${chatId}` },
            { text: 'Block', callback_data: `block_${chatId}` }
          ]
        ]
      }
    });

    bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');
  }
});

// Handle admin replies and actions (block/unblock)
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const targetChatId = callbackQuery.data.split('_')[1];

  if (callbackQuery.data.startsWith('reply_')) {
    bot.sendMessage(adminChatId, 'Please type your reply:').then((sentMessage) => {
      const replyPromptMessageId = sentMessage.message_id;

      // Listen for the admin's reply and send it to the user
      bot.once('message', async (replyMsg) => {
        const replyText = replyMsg.text;

        // Send the admin's reply to the user
        bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);

        // Save the admin reply in MongoDB
        await db.collection('messages').insertOne({
          chatId: targetChatId,
          text: replyText,
          from: 'admin',
          timestamp: new Date()
        });

        // Confirm reply sent to admin without showing the reply as a new message
        bot.sendMessage(adminChatId, 'Your reply has been sent.');
        bot.deleteMessage(adminChatId, replyPromptMessageId).catch(err => console.log('Failed to delete message', err));
      });
    });

    // Remove the inline keyboard after reply action
    bot.editMessageReplyMarkup({}, { chat_id: adminChatId, message_id: messageId });
  } else if (callbackQuery.data.startsWith('block_')) {
    const blockedChatId = callbackQuery.data.split('_')[1];
    await blockUser(blockedChatId);

    // Notify the admin and update buttons
    bot.sendMessage(adminChatId, `User ${blockedChatId} has been blocked.`);
    bot.editMessageReplyMarkup({
      inline_keyboard: [
        [{ text: 'Unblock', callback_data: `unblock_${blockedChatId}` }]
      ]
    }, { chat_id: adminChatId, message_id: messageId });
  } else if (callbackQuery.data.startsWith('unblock_')) {
    const unblockedUserId = callbackQuery.data.split('_')[1];
    await unblockUser(unblockedUserId);

    // Notify the admin and update buttons
    bot.sendMessage(adminChatId, `User ${unblockedUserId} has been unblocked.`);
    bot.editMessageReplyMarkup({
      inline_keyboard: [
        [{ text: 'Block', callback_data: `block_${unblockedUserId}` }]
      ]
    }, { chat_id: adminChatId, message_id: messageId });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
