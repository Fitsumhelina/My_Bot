require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Replace with your actual bot token
const token = process.env.TELEGRAM_BOT_TOKEN || '7041187201:AAFi2fG36ToOc0AUIw1JGVX73xaf2k0yAOM';
const bot = new TelegramBot(token, { polling: true });

// Send a welcome message when the bot is started (/start command)
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  // Welcome message
  bot.sendMessage(chatId, `Hello ${firstName} 🖐🏿 Welcome to my Telegram bot. How can I assist you today?`);
});

// Listen for any kind of message
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  
  // Ignore the /start command to prevent duplication
  if (messageText === '/start') return;

  // Log the received message for reference
  console.log(`Received message from ${msg.from.first_name} (${chatId}): ${messageText}`);

  // Reply with an inline button that allows you to respond to the message
  bot.sendMessage(chatId, 'Thank you for your message! I will be in touch soon. If you would like a response now, click below.', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Reply',
            callback_data: `reply_${chatId}` // Store the chatId in the callback
          }
        ]
      ]
    }
  });
});

// Handle inline button callback
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  // Extract the chat ID from the callback data
  const targetChatId = callbackQuery.data.split('_')[1];
  
  // Reply prompt
  bot.sendMessage(chatId, 'Please type your reply:');

  // Set up a one-time listener for the next message
  bot.once('message', (replyMsg) => {
    const replyText = replyMsg.text;
    
    // Send the reply to the user who originally sent the message
    bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);
    
    // Acknowledge that the reply was sent
    bot.sendMessage(chatId, 'Your reply has been sent.');
  });
});
