// bot.js
const bot = require('./controllers/botController');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const webhookUrl = process.env.WEBHOOK_URL;
bot.setWebHook(`${webhookUrl}/bot${process.env.TELEGRAM_BOT_TOKEN}`);

app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

module.exports = app;
