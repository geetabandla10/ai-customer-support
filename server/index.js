const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const OpenAI = require('openai');
require('dotenv').config();

const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const FAQ = require('./models/FAQ');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-support';

// Initialize OpenAI using OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    // Ensure a default user exists for demonstration
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        name: 'Tharun Bandla',
        email: 'tharun@example.com',
        avatar: 'TB'
      });
      console.log('Default user created');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// --- ADMIN ROUTES ---
// Get all users and chats for Admin
app.get('/api/admin/chats', async (req, res) => {
  try {
    const chats = await Chat.find()
      .populate('userId', 'name email avatar')
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FAQ ROUTES ---
app.get('/api/faqs', async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/faqs', async (req, res) => {
  try {
    const { question, answer } = req.body;
    const newFaq = await FAQ.create({ question, answer });
    res.json(newFaq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/faqs/:id', async (req, res) => {
  try {
    const { question, answer } = req.body;
    const updatedFaq = await FAQ.findByIdAndUpdate(
      req.params.id, 
      { question, answer, updatedAt: Date.now() },
      { new: true }
    );
    res.json(updatedFaq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/faqs/:id', async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chats for a user
app.get('/api/chats/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(440).json({ error: 'User not found' });

    const chats = await Chat.find({ userId: user._id }).sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint with persistence
app.post('/api/chat', async (req, res) => {
  const { message, email, chatId } = req.body;
  
  if (!process.env.OPENROUTER_API_KEY && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here')) {
    return res.status(500).json({
      error: 'OpenRouter / OpenAI API key is missing. Please add it to the server/.env file.',
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let currentChat;
    if (chatId) {
      currentChat = await Chat.findById(chatId);
    }

    if (!currentChat) {
      currentChat = await Chat.create({
        userId: user._id,
        title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
        lastMessage: message
      });
    }

    // Save user message
    const userMsg = await Message.create({
      chatId: currentChat._id,
      content: message,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    let aiResponse = "";
    
    // Check FAQ matching
    const faqs = await FAQ.find();
    const normalizedMsg = message.toLowerCase().trim();
    
    // 1. Try exact match
    let matchedFaq = faqs.find(f => f.question.toLowerCase() === normalizedMsg);
    
    // 2. Try partial match (if FAQ question is a significant phrase)
    if (!matchedFaq) {
      matchedFaq = faqs.find(f => f.question.length > 4 && normalizedMsg.includes(f.question.toLowerCase()));
    }
    
    if (matchedFaq) {
      aiResponse = matchedFaq.answer;
    } else {
      // Get OpenAI response if no FAQ matched
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional, polite, and helpful customer support assistant for SupportAI. Provide concise and clear answers."
          },
          ...((await Message.find({ chatId: currentChat._id }).sort({ createdAt: 1 }).limit(10)).map(m => ({
            role: m.isBot ? "assistant" : "user",
            content: m.content
          }))),
          {
            role: "user",
            content: message
          }
        ],
      });

      aiResponse = completion.choices[0].message.content;
    }

    const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Save bot message
    const botMsg = await Message.create({
      chatId: currentChat._id,
      content: aiResponse,
      isBot: true,
      timestamp: aiTimestamp
    });

    // Update chat last message
    currentChat.lastMessage = aiResponse;
    currentChat.updatedAt = Date.now();
    await currentChat.save();

    res.json({
      reply: aiResponse,
      timestamp: aiTimestamp,
      chatId: currentChat._id
    });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
