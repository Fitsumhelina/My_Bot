// routes/userRoutes.js
const express = require('express');
const { askQuestion, contactMe } = require('../controllers/userController');

const router = express.Router();

router.post('/ask', askQuestion);
router.post('/contact', contactMe);

module.exports = router;
