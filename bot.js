require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

// Initialize MongoDB client
const mongoUri = process.env.MONGODB_URI; // MongoDB URI for Atlas
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

// Connect to MongoDB and initialize database
client.connect().then(() => {
  db = client.db('telegramBot');
  console.log('Connected to MongoDB');
});

// Utility to get chat history
async function getChatHistory(chatId, limit = 5) {
  const messages = await db.collection('messages').find({ chatId }).sort({ timestamp: -1 }).limit(limit).toArray();
  return messages.reverse(); // Show in chronological order
}

// Utility to block user
async function blockUser(userId) {
  await db.collection('blockedUsers').updateOne({ userId }, { $set: { userId } }, { upsert: true });
}

// Utility to unblock user
async function unblockUser(userId) {
  await db.collection('blockedUsers').deleteOne({ userId });
}

// Check if user is blocked
async function isUserBlocked(userId) {
  const blockedUser = await db.collection('blockedUsers').findOne({ userId });
  return !!blockedUser;
}

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
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const userId = msg.from.id;

  // Ignore the /start command
  if (messageText === '/start') return;

  if (await isUserBlocked(userId)) {
    bot.sendMessage(chatId, "You are blocked from sending messages.");
    return;
  }

  if (chatId !== adminChatId) {
    bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');

    // Save user message to MongoDB
    await db.collection('messages').insertOne({
      chatId,
      userId,
      text: messageText,
      from: 'user',
      timestamp: new Date()
    });

    const chatHistory = await getChatHistory(chatId);
    const messageDetails = chatHistory.map(msg => `${msg.from}: ${msg.text}`).join('\n');
    
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
  } else {
    bot.sendMessage(chatId, `Hello Boss, please select a reply option.`);
  }
});

// Handle the admin's reply to a specific user
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const targetChatId = callbackQuery.data.split('_')[1];

  if (callbackQuery.data.startsWith('reply_')) {
    // Ask the admin to type their reply
    bot.sendMessage(adminChatId, 'Please type your reply:').then((sentMessage) => {
      const replyPromptMessageId = sentMessage.message_id; // Get the message ID of the "Please type your reply" message

      // Listen for the admin's reply and send it to the user
      bot.once('message', async (replyMsg) => {
        const replyText = replyMsg.text;
        const userId = replyMsg.from.id;

        // Send the admin's reply to the user
        bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);

        // Save admin reply to MongoDB
        await db.collection('messages').insertOne({
          chatId: targetChatId,
          userId,
          text: replyText,
          from: 'admin',
          timestamp: new Date()
        });

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
  } else if (callbackQuery.data.startsWith('block_')) {
    const blockedChatId = callbackQuery.data.split('_')[1];
    const blockedUser = await bot.getChatMember(blockedChatId, adminChatId);
    const blockedUserId = blockedUser.user.id;

    // Block user
    await blockUser(blockedUserId);
    bot.sendMessage(adminChatId, `User ${blockedChatId} has been blocked.`);
    
    // Optionally, notify the user if needed
    bot.sendMessage(blockedChatId, 'You have been blocked by the admin.');
    
    // Remove the inline keyboard
    bot.editMessageReplyMarkup({}, {
      chat_id: adminChatId,
      message_id: messageId
    });
  } else if (callbackQuery.data.startsWith('unblock_')) {
    const unblockedUserId = callbackQuery.data.split('_')[1];

    // Unblock user
    await unblockUser(unblockedUserId);
    bot.sendMessage(adminChatId, `User ${unblockedUserId} has been unblocked.`);
    
    // Remove the inline keyboard
    bot.editMessageReplyMarkup({}, {
      chat_id: adminChatId,
      message_id: messageId
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
