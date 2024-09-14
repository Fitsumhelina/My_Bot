// server.js
const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Telegram Bot Server Running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Initialize the bot
require('./bot');
