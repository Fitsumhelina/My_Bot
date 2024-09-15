// routes/adminRoutes.js
const express = require('express');
const { createEvent, getChats } = require('../controllers/adminController');

const router = express.Router();

router.post('/event', createEvent);
router.get('/chats', getChats);

module.exports = router;
