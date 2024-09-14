// require('dotenv').config();
// const TelegramBot = require('node-telegram-bot-api');
// const express = require('express');
// const bodyParser = require('body-parser');
// const { MongoClient } = require('mongodb');

// // Express setup
// const app = express();
// app.use(bodyParser.json());

// // Replace with your actual bot token and admin chat ID (your Telegram user ID)
// const token = process.env.TELEGRAM_BOT_TOKEN;
// const adminChatId = process.env.ADMIN_TELEGRAM_USER_ID; // Your Telegram user ID (get it from @userinfobot)
// const mongoUrl = process.env.MONGO_URL; // Replace with your MongoDB Atlas URL
// const port = process.env.PORT || 3000;
// const webhookUrl = process.env.WEBHOOK_URL; // Replace with your deployed Railway URL

// // Set up the Telegram bot
// const bot = new TelegramBot(token);

// // MongoDB setup
// let db;
// MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then((client) => {
//     db = client.db('telegram-bot-db'); // Replace with your actual database name
//     console.log('Connected to MongoDB');
//   })
//   .catch((err) => console.log('Error connecting to MongoDB:', err));

// // Set the webhook to receive updates
// bot.setWebHook(`${webhookUrl}/bot${token}`);

// // Webhook endpoint to receive Telegram updates
// app.post(`/bot${token}`, (req, res) => {
//   bot.processUpdate(req.body);
//   res.sendStatus(200);
// });

// // Function to save chat history
// async function saveChatMessage(chatId, from, content) {
//   await db.collection('chatHistories').updateOne(
//     { chatId },
//     {
//       $push: {
//         messages: {
//           from,
//           content,
//           timestamp: new Date(),
//         },
//       },
//     },
//     { upsert: true }
//   );
// }

// // Function to fetch the recent (6) messages between the user and admin
// async function getRecentMessages(chatId) {
//   const chatHistory = await db.collection('chatHistories').findOne({ chatId });
//   if (!chatHistory || !chatHistory.messages) {
//     return 'No previous chat history.';
//   }
//   const recentMessages = chatHistory.messages.slice(-6); // Get the most recent 6 messages
//   return recentMessages
//     .map((msg) => `${msg.from === 'user' ? 'user' : 'admin'}: ${msg.content}`)
//     .join('\n');
// }

// // Handle incoming messages from users (supports text, audio, video, document, sticker)
// bot.on('message', async (msg) => {
//   const chatId = msg.chat.id;
//   const userId = msg.from.id;

//   // Handle different types of messages
//   let messageContent = '';
//   if (msg.text) {
//     messageContent = msg.text;
//   } else if (msg.audio) {
//     messageContent = '[Audio Message]';
//   } else if (msg.video) {
//     messageContent = '[Video Message]';
//   } else if (msg.document) {
//     messageContent = '[Document]';
//   } else if (msg.sticker) {
//     messageContent = `[Sticker] ${msg.sticker.emoji || ''}`;
//   }

//   // Save the message in the user's chat history
//   await saveChatMessage(chatId, 'user', messageContent);

//   // Fetch and display the most recent 6 messages between the admin and the user
//   const recentMessages = await getRecentMessages(chatId);

//   // Notify the admin about the new message and show chat history
//   bot.sendMessage(
//     adminChatId,
//     `Message from ${msg.from.first_name} (@${msg.from.username}): "${messageContent}"\n\nChat History:\n${recentMessages}`,
//     {
//       reply_markup: {
//         inline_keyboard: [
//           [
//             { text: 'Reply', callback_data: `reply_${chatId}` },
//             { text: 'Block', callback_data: `block_${chatId}` },
//           ],
//         ],
//       }
//     }
//   );

//   // Send a "Thank you" message to the user
//   bot.sendMessage(chatId, 'Thank you for your message! I will be in touch with you soon.');
// });

// // Handle admin reply without showing as user message
// bot.on('callback_query', async (callbackQuery) => {
//   const chatId = callbackQuery.message.chat.id;
//   const messageId = callbackQuery.message.message_id;
//   const targetChatId = callbackQuery.data.split('_')[1];

//   if (callbackQuery.data.startsWith('reply_')) {
//     bot.sendMessage(adminChatId, 'Please type your reply:').then((sentMessage) => {
//       const replyPromptMessageId = sentMessage.message_id;

//       // Listen for the admin's reply
//       bot.once('message', async (replyMsg) => {
//         const replyText = replyMsg.text;

//         // If the reply is from the admin, send the reply to the user
//         if (replyMsg.chat.id === adminChatId) {
//           // Send the admin's reply to the user
//           bot.sendMessage(targetChatId, `Reply from admin: ${replyText}`);

//           // Save the admin reply in the user's chat history
//           await saveChatMessage(targetChatId, 'admin', replyText);

//           // Confirm the reply was sent and delete the input prompt
//           bot.sendMessage(adminChatId, 'Your reply has been sent.');
//           bot.deleteMessage(adminChatId, replyPromptMessageId).catch(err => console.log('Failed to delete message', err));
//         }
//       });
//     });

//     // Remove the inline keyboard after reply action
//     bot.editMessageReplyMarkup({}, { chat_id: adminChatId, message_id: messageId });
//   }
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
