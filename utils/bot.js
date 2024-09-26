// utils/bot.js
const { Telegraf } = require('telegraf');
const User = require('../models/User');
const Message = require('../models/Message');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
  const { id, username, first_name, last_name } = ctx.from;
  let user = await User.findOne({ telegramId: id });

  if (!user) {
    user = new User({
      telegramId: id,
      username,
      firstName: first_name,
      lastName: last_name,
    });
    await user.save();
  }

  ctx.reply('Welcome! Feel free to send your message.');
});

bot.on('message', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });

  if (user.blocked) {
    return ctx.reply('You are blocked.');
  }

  const newMessage = new Message({
    sender: user._id,
    text: ctx.message.text,
    sentBy: 'user',
  });

  await newMessage.save();
  ctx.reply('I will be in touch with you as soon as I can.');
});

// Export bot instance
module.exports = bot;
