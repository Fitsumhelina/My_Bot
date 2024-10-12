require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User schema for storing blocked users
const userSchema = new mongoose.Schema({
  userId: Number,
  isBlocked: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome! You can use the 'Ask a Question' option to submit your question.");
});

// Handle user messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text || msg.caption;

  // Check if user is blocked
  const user = await User.findOne({ userId: chatId });
  if (user && user.isBlocked) {
    bot.sendMessage(chatId, "You are blocked from sending messages.");
    return;
  }

  // Handle 'Ask a Question' scenario
  if (userMessage === 'Ask a Question') {
    bot.sendMessage(chatId, "Please submit your question:");
  } else {
    // Confirm receipt to the user
    bot.sendMessage(chatId, "Thank you for your question! I will be in touch with you soon.");

    // Forward the message to the admin
    const messageType = msg.photo ? 'photo' : msg.document ? 'document' : 'text';
    if (messageType === 'photo') {
      bot.sendPhoto(ADMIN_CHAT_ID, msg.photo[msg.photo.length - 1].file_id, {
        caption: `Message from user ${chatId}: ${msg.caption || ''}`,
        reply_markup: adminReplyMarkup(chatId),
      });
    } else if (messageType === 'document') {
      bot.sendDocument(ADMIN_CHAT_ID, msg.document.file_id, {
        caption: `Message from user ${chatId}: ${msg.caption || ''}`,
        reply_markup: adminReplyMarkup(chatId),
      });
    } else {
      bot.sendMessage(ADMIN_CHAT_ID, `Message from user ${chatId}: ${userMessage}`, {
        reply_markup: adminReplyMarkup(chatId),
      });
    }
  }
});

// Generate reply markup for admin
function adminReplyMarkup(userId) {
  return JSON.stringify({
    inline_keyboard: [
      [{ text: 'Reply', callback_data: `reply_${userId}` }],
      [{ text: 'Block User', callback_data: `block_${userId}` }]
    ]
  });
}

// Handle admin interactions (reply or block)
bot.on('callback_query', async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  if (data.startsWith('reply_')) {
    const userId = data.split('_')[1];
    bot.sendMessage(chatId, 'Please type your reply:');
    
    bot.once('message', (msg) => {
      const reply = msg.text;
      bot.sendMessage(userId, `From Admin: ${reply}`);
      bot.sendMessage(chatId, 'Reply sent successfully!');
    });
  } else if (data.startsWith('block_')) {
    const userId = data.split('_')[1];
    
    // Block the user
    await User.updateOne({ userId: userId }, { isBlocked: true }, { upsert: true });
    bot.sendMessage(userId, "You have been blocked from sending messages.");
    bot.sendMessage(chatId, `User ${userId} has been blocked.`);
  }
});
