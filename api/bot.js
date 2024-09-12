const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_TELEGRAM_USER_ID;
const bot = new TelegramBot(token);

// Set the webhook when deployed on Vercel
const webhookUrl = `${process.env.VERCEL_URL}/api/bot`; // This will automatically point to your Vercel deployment

bot.setWebHook(webhookUrl);

export default async (req, res) => {
  if (req.method === 'POST') {
    bot.processUpdate(req.body); // Process incoming Telegram messages
    res.status(200).send('Webhook received and processed');
  } else {
    res.status(200).send('This endpoint is only for Telegram webhooks');
  }
};

// Logic to handle bot messages and replies (same as before)
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'there';
  if (chatId !== adminChatId) {
    bot.sendMessage(chatId, `Hello ${firstName} 🖐🏿! Welcome to my Telegram bot. How can I assist you today?`);
  } else {
    bot.sendMessage(chatId, `Hello Boss`);
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const firstName = msg.from.first_name || 'there';
  const username = msg.from.username || 'No username';

  if (messageText === '/start') return;

  if (chatId !== adminChatId) {
    bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');
  } else {
    bot.sendMessage(chatId, `Hello Boss, please select reply first.`);
  }

  if (chatId !== adminChatId) {
    const userFullName = `${msg.from.first_name} ${msg.from.last_name}`;
    const messageDetails = `Message from ${userFullName} (@${username}): "${messageText}"`;

    bot.sendMessage(adminChatId, messageDetails, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Reply',
              callback_data: `reply_${chatId}`,
            },
          ],
        ],
      },
    });
  }
});

bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const targetChatId = callbackQuery.data.split('_')[1];

  bot.sendMessage(adminChatId, 'Please type your reply:').then((sentMessage) => {
    const replyPromptMessageId = sentMessage.message_id;

    bot.once('message', (replyMsg) => {
      const replyText = replyMsg.text;
      bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);
      bot.sendMessage(adminChatId, 'Your reply has been sent.');
      bot.deleteMessage(adminChatId, replyPromptMessageId).catch((err) => console.log('Failed to delete message', err));
    });
  });

  bot.editMessageReplyMarkup({}, {
    chat_id: adminChatId,
    message_id: messageId,
  });
});
