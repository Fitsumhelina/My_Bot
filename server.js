require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

const User = require('./models/User');
const Message = require('./models/Message');
const Event = require('./models/Event');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
.catch(err => console.log(err));

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// User Side: Ask a Question
bot.onText(/\/ask/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Please send your question (you can include text, images, or audio).');
  
  bot.once('message', (question) => {
    if (question.text || question.photo || question.audio) {
      const newMessage = new Message({
        sender: 'user',
        text: question.text || null,
        multimedia: question.photo || question.audio || null,
        chatId
      });

      newMessage.save();
      bot.sendMessage(chatId, 'Thank you for your question! I will be in touch with you soon.');
    }
  });
});

// User Side: Contact Me
bot.onText(/\/contact/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Please share your contact details and select a tag (e.g., #Collaboration, #HireMe).');

  bot.once('contact', (contact) => {
    bot.sendMessage(chatId, 'Thank you for your contact. Please send a message with multimedia if needed.');
    const newUser = new User({
      chatId,
      name: contact.contact.first_name,
      phoneNumber: contact.contact.phone_number,
      username: contact.from.username
    });

    newUser.save();
    bot.once('message', (message) => {
      const newMessage = new Message({
        sender: 'user',
        text: message.text,
        multimedia: message.photo || message.audio || null,
        chatId
      });

      newMessage.save();
      bot.sendMessage(chatId, 'Thank you for contacting me! I will be in touch with you soon.');
    });
  });
});

// User Side: View Events
bot.onText(/\/events/, async (msg) => {
  const chatId = msg.chat.id;
  const events = await Event.find();

  if (events.length === 0) {
    bot.sendMessage(chatId, 'No events are available right now.');
  } else {
    let eventList = 'Here are the upcoming events:\n';
    events.forEach((event, index) => {
      eventList += `${index + 1}. ${event.title} - ${event.date}\n${event.description}\n\n`;
    });
    bot.sendMessage(chatId, eventList);
  }
});

// Admin Side: Manage Messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (chatId == process.env.ADMIN_ID) {
    const userChatId = ...;  
    bot.sendMessage(userChatId, msg.text);
    return;
  }

  const userMessage = new Message({
    sender: 'user',
    text: msg.text || null,
    multimedia: msg.photo || msg.audio || null,
    chatId
  });

  await userMessage.save();
  bot.sendMessage(process.env.ADMIN_ID, `New message from ${msg.chat.username}: ${msg.text}`);
});

// Admin Side: Broadcast
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (chatId == process.env.ADMIN_ID) {
    const message = match[1];
    const users = await User.find();
    
    users.forEach(user => {
      bot.sendMessage(user.chatId, message);
    });
  }
});

// Admin Side: Manage Events
bot.onText(/\/add_event/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId == process.env.ADMIN_ID) {
    bot.sendMessage(chatId, 'Please send event details in the format: title | description | date');
    bot.once('message', async (eventMsg) => {
      const [title, description, date] = eventMsg.text.split('|');
      const newEvent = new Event({ title, description, date: new Date(date) });
      await newEvent.save();
      bot.sendMessage(chatId, 'Event added successfully.');
    });
  }
});
