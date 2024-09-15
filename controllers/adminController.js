// controllers/adminController.js
const Event = require('../models/Event');
const Chat = require('../models/Chat');

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date } = req.body;
    const newEvent = new Event({ title, description, date });
    await newEvent.save();
    res.status(201).json({ message: 'Event created successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error creating event.' });
  }
};

exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find().populate('userId', 'name');
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching chats.' });
  }
};
