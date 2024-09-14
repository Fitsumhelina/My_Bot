// bot.js
const TelegramBot = require('node-telegram-bot-api');
const Question = require('./models/question');
const Message = require('./models/message');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Ask a Question
bot.onText(/\/ask/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 'Please send your question.');
  
  bot.once('message', (questionMsg) => {
    if (questionMsg.text) {
      const question = new Question({
        userId: questionMsg.from.id,
        question: questionMsg.text,
        multimedia: [],
      });
      
      question.save().then(() => {
        bot.sendMessage(chatId, 'Thank you for your question! I will be in touch with you soon.');
      });
    }
  });
});

// Contact Me
bot.onText(/\/contact/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Please share your name and phone number.');

  bot.once('message', (contactMsg) => {
    if (contactMsg.text) {
      // Assume the user sends "name, phone"
      const [name, phone] = contactMsg.text.split(',');

      bot.sendMessage(chatId, 'Select a tag: #Collaboration, #HireMe, #Promotion');
      
      bot.once('message', (tagMsg) => {
        const message = new Message({
          userId: msg.from.id,
          name,
          phone,
          tag: tagMsg.text,
          message: "Initial contact",
          multimedia: [],
        });

        message.save().then(() => {
          bot.sendMessage(chatId, 'Thank you for contacting me! I will be in touch with you soon.');
        });
      });
    }
  });
});
