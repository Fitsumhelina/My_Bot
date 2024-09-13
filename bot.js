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
// Handle incoming messages from users
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const userId = msg.from.id;

  // Check if the message is from the admin
  const isAdmin = chatId === adminChatId;

  if (messageText === '/start') return; // Ignore the /start command

  // If the message is from the admin, ignore it and do not treat it as a user message
  if (isAdmin) {
    return; // Admin message shouldn't be processed as a user message
  }

  // Save the user message to MongoDB
  await db.collection('messages').insertOne({
    chatId,
    userId,
    text: messageText,
    from: 'user', // Mark the source as 'user'
    timestamp: new Date()
  });

  // Fetch recent chat history between the user and the admin
  const chatHistory = await getChatHistory(chatId);
  const messageDetails = chatHistory
    .map(msg => `${msg.from === 'user' ? 'user' : 'admin'}: ${msg.text}`)
    .join('\n');

  // Notify the admin about the new message and show chat history
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

  // Send the standard "Thank you" message only to the user
  bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');
});

// Handle admin reply and prevent it from showing as a user message
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const targetChatId = callbackQuery.data.split('_')[1];

  if (callbackQuery.data.startsWith('reply_')) {
    bot.sendMessage(adminChatId, 'Please type your reply:').then((sentMessage) => {
      const replyPromptMessageId = sentMessage.message_id;

      // Listen for the admin's reply
      bot.once('message', async (replyMsg) => {
        const replyText = replyMsg.text;

        // If the reply is from the admin, send the reply to the user without showing it as a new message on the admin side
        if (replyMsg.chat.id === adminChatId) {
          // Send the admin's reply to the user
          bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);

          // Save the admin reply in MongoDB
          await db.collection('messages').insertOne({
            chatId: targetChatId,
            text: replyText,
            from: 'admin', // Mark the source as 'admin'
            timestamp: new Date()
          });

          // Confirm the reply was sent and delete the input prompt
          bot.sendMessage(adminChatId, 'Your reply has been sent.');
          bot.deleteMessage(adminChatId, replyPromptMessageId).catch(err => console.log('Failed to delete message', err));
        }
      });
    });

    // Remove the inline keyboard after reply action
    bot.editMessageReplyMarkup({}, { chat_id: adminChatId, message_id: messageId });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
