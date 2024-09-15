// controllers/userController.js
const User = require('../models/User');
const Contact = require('../models/Contact');
const Question = require('../models/Question');

exports.askQuestion = async (req, res) => {
  try {
    const { userId, question } = req.body;
    const newQuestion = new Question({ userId, question });
    await newQuestion.save();
    res.status(201).json({ message: 'Question submitted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error submitting question.' });
  }
};

exports.contactMe = async (req, res) => {
  try {
    const { userId, name, phone, tag, message } = req.body;
    const newContact = new Contact({ userId, name, phone, tag, message });
    await newContact.save();
    res.status(201).json({ message: 'Contact details saved successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error saving contact details.' });
  }
};
