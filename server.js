// server.js
const app = require('./bot');
const connectDB = require('./config/db');
require('dotenv').config();

const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
