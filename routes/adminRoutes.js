// routes/adminRoutes.js
const { Scenes } = require('telegraf');
const { getRecentChatHistory, replyToUser, blockUser } = require('../controllers/adminController');

const admin = new Scenes.BaseScene('admin');

admin.enter((ctx) => ctx.reply('Welcome Admin. Use /reply or /block commands.'));

admin.command('reply', async (ctx) => {
  const userId = ctx.message.text.split(' ')[1];  // Extract userId
  const replyText = ctx.message.text.split(' ').slice(2).join(' ');
  await replyToUser(ctx, userId, replyText);
});

admin.command('block', async (ctx) => {
  const userId = ctx.message.text.split(' ')[1];
  await blockUser(ctx, userId);
});

module.exports = admin;
