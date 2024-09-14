const { saveChatMessage, getRecentMessages } = require('../services/messageService');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Handle incoming messages
const handleUserMessage = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Determine the message content type
  let messageContent = '';
  if (msg.text) {
    messageContent = msg.text;
  } else if (msg.audio) {
    messageContent = '[Audio Message]';
  } else if (msg.video) {
    messageContent = '[Video Message]';
  } else if (msg.document) {
    messageContent = '[Document]';
  } else if (msg.sticker) {
    messageContent = `[Sticker] ${msg.sticker.emoji || ''}`;
  }

  // Save the message to the database
  await saveChatMessage(chatId, 'user', messageContent);

  // Fetch recent chat history
  const recentMessages = await getRecentMessages(chatId);

  // Notify the admin
  bot.sendMessage(
    process.env.ADMIN_TELEGRAM_USER_ID,
    `Message from ${msg.from.first_name} (@${msg.from.username}): "${messageContent}"\n\nChat History:\n${recentMessages}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Reply', callback_data: `reply_${chatId}` }, { text: 'Block', callback_data: `block_${chatId}` }],
        ],
      },
    }
  );

  // Acknowledge the user
  bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');
};

// Handle admin replies
const handleAdminReply = async (callbackQuery) => {
  const messageId = callbackQuery.message.message_id;
  const targetChatId = callbackQuery.data.split('_')[1];

  if (callbackQuery.data.startsWith('reply_')) {
    bot.sendMessage(process.env.ADMIN_TELEGRAM_USER_ID, 'Please type your reply:').then((sentMessage) => {
      const replyPromptMessageId = sentMessage.message_id;

      bot.once('message', async (replyMsg) => {
        const replyText = replyMsg.text;

        if (replyMsg.chat.id.toString() === process.env.ADMIN_TELEGRAM_USER_ID) {
          bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);
          await saveChatMessage(targetChatId, 'admin', replyText);
          bot.sendMessage(process.env.ADMIN_TELEGRAM_USER_ID, 'Your reply has been sent.');
          bot.deleteMessage(process.env.ADMIN_TELEGRAM_USER_ID, replyPromptMessageId).catch((err) => console.log('Failed to delete message', err));
        }
      });
    });

    bot.editMessageReplyMarkup({}, { chat_id: process.env.ADMIN_TELEGRAM_USER_ID, message_id: messageId });
  }
};

bot.on('message', handleUserMessage);
bot.on('callback_query', handleAdminReply);

module.exports = bot;
