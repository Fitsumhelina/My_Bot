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

// Handle /start command but don’t show it as a normal message
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || '';
  const username = msg.from.username || '';

  // Send the welcome message only to the user, not to the admin
  bot.sendMessage(chatId, `Welcome ${firstName}! You can use the 'Ask a Question' option to submit your question.`);
});

// Handle user messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || '';
  const username = msg.from.username || '';
  const userMessage = msg.text || msg.caption;

  // Ignore /start messages
  if (userMessage === '/start') return;

  // Check if user is blocked
  const user = await User.findOne({ userId: chatId });
  if (user && user.isBlocked) {
    bot.sendMessage(chatId, "You are blocked from sending messages.");
    return;
  }

  // If it's the "Ask a Question" command, guide the user to submit their question
  if (userMessage === 'Ask a Question') {
    bot.sendMessage(chatId, `Please submit your question, ${firstName}:`);
  } else {
    // Send confirmation to the user only after they send their actual question or message
    bot.sendMessage(chatId, `Thank you for your question, ${firstName}! I will be in touch with you soon.`);

    // Send the message to the admin with the user's name and username (avoid repeating the message)
    const messageType = msg.photo ? 'photo' : msg.document ? 'document' : 'text';
    const displayName = `${firstName}${username ? ` (@${username})` : ''}`;

    if (messageType === 'photo') {
      bot.sendPhoto(ADMIN_CHAT_ID, msg.photo[msg.photo.length - 1].file_id, {
        caption: `Message from ${displayName}: ${msg.caption || ''}`,
        reply_markup: adminReplyMarkup(chatId),
      });
    } else if (messageType === 'document') {
      bot.sendDocument(ADMIN_CHAT_ID, msg.document.file_id, {
        caption: `Message from ${displayName}: ${msg.caption || ''}`,
        reply_markup: adminReplyMarkup(chatId),
      });
    } else {
      bot.sendMessage(ADMIN_CHAT_ID, `Message from ${displayName}: ${userMessage}`, {
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
