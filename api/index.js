const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const FAQ = require('./models/FAQ');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-support';

// Initialize OpenAI using OpenRouter (with dummy fallback to prevent fatal startup crash)
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || 'dummy_key_to_prevent_fatal_crash',
});

app.use(cors());
app.use(express.json());

let isMongoConnected = false;

// Connect to MongoDB
if (!process.env.MONGODB_URI && (require.main === module || process.env.NODE_ENV !== 'production')) {
  console.log('⚠️  WARNING: MONGODB_URI is missing from your .env file!');
  console.log('👉 Please add: MONGODB_URI="your_mongodb_atlas_string_here" to your api/.env file.');
  console.log('💡 RECTIFYING: Falling back to local db.json storage for now.');
}

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, 
})
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully');
    isMongoConnected = true;
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        name: 'Tharun Bandla',
        email: 'tharun@example.com',
        avatar: 'TB'
      });
    }
  })
  .catch(err => {
    console.warn('❌ MongoDB Error:', err.message);
    console.log('🚀 Using Local JSON Fallback (db.json)');
    isMongoConnected = false;
  });

// Abstraction for Database (Switch between Mongo and JSON)
const jsonDB = require('./jsonDB');
const getDb = (modelName) => {
  const readyState = mongoose.connection.readyState;
  const useMongo = isMongoConnected && readyState === 1; // 1 = connected
  
  if (useMongo) {
    if (modelName === 'User') return User;
    if (modelName === 'Chat') return Chat;
    if (modelName === 'Message') return Message;
    if (modelName === 'FAQ') return FAQ;
  }
  
  console.log(`📡 [DB] ${modelName} request handled by ${useMongo ? 'MongoDB' : 'JSON Fallback'} (readyState: ${readyState})`);
  
  // Simplified mock methods that match Mongoose basics
  const mockModel = jsonDB[modelName.toLowerCase() + 's'] || jsonDB[modelName.toLowerCase()];
  return mockModel;
};

// --- ADMIN ROUTES ---
app.get(['/api/admin/chats', '/admin/chats'], async (req, res) => {
  try {
    const Db = getDb('Chat');
    const chats = isMongoConnected 
      ? await Db.find().populate('userId', 'name email avatar').sort({ updatedAt: -1 })
      : await Db.find();
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FAQ ROUTES ---
app.get(['/api/faqs', '/faqs'], async (req, res) => {
  try {
    const Db = getDb('FAQ');
    const faqs = await Db.find(); // Mock find already sorts
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(['/api/faqs', '/faqs'], async (req, res) => {
  try {
    const Db = getDb('FAQ');
    const { question, answer } = req.body;
    const newFaq = await Db.create({ question, answer });
    res.json(newFaq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put(['/api/faqs/:id', '/faqs/:id'], async (req, res) => {
  try {
    const Db = getDb('FAQ');
    const { question, answer } = req.body;
    const updatedFaq = await Db.findByIdAndUpdate(
      req.params.id, 
      { question, answer },
      { new: true }
    );
    res.json(updatedFaq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete(['/api/faqs/:id', '/faqs/:id'], async (req, res) => {
  try {
    const Db = getDb('FAQ');
    await Db.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chats for a user
app.get(['/api/chats/:email', '/chats/:email'], async (req, res) => {
  try {
    const UserDb = getDb('User');
    const ChatDb = getDb('Chat');
    const user = await UserDb.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const chats = await ChatDb.find({ userId: isMongoConnected ? user._id : user._id });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
app.get(['/api/messages/:chatId', '/messages/:chatId'], async (req, res) => {
  try {
    const MsgDb = getDb('Message');
    const messages = await MsgDb.find({ chatId: req.params.chatId });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint with persistence
app.post(['/api/chat', '/chat'], async (req, res) => {
  const { message, email, chatId } = req.body;
  
  if (!process.env.OPENROUTER_API_KEY && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here')) {
    return res.status(500).json({
      error: 'OpenRouter / OpenAI API key is missing. Please add it to the server/.env file.',
    });
  }

  try {
    const UserDb = getDb('User');
    const ChatDb = getDb('Chat');
    const MsgDb = getDb('Message');
    const FaqDb = getDb('FAQ');

    const user = await UserDb.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let currentChat;
    if (chatId) {
      currentChat = await ChatDb.findById(chatId);
    }

    if (!currentChat) {
      currentChat = await ChatDb.create({
        userId: user._id,
        title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
        lastMessage: message
      });
    }

    // Save user message
    const userMsg = await MsgDb.create({
      chatId: isMongoConnected ? currentChat._id : currentChat._id,
      content: message,
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    let aiResponse = "";
    
    // Check FAQ matching
    const faqs = await FaqDb.find();
    const normalizedMsg = message.toLowerCase().trim();
    
    // 1. Try exact match
    let matchedFaq = faqs.find(f => f.question.toLowerCase() === normalizedMsg);
    
    // 2. Try partial match
    if (!matchedFaq) {
      matchedFaq = faqs.find(f => f.question.length > 4 && normalizedMsg.includes(f.question.toLowerCase()));
    }
    
    if (matchedFaq) {
      aiResponse = matchedFaq.answer;
    } else {
      // Get OpenAI response if no FAQ matched
      const history = isMongoConnected 
        ? await MsgDb.find({ chatId: currentChat._id }).sort({ createdAt: 1 }).limit(10)
        : await MsgDb.find({ chatId: currentChat._id });

      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional, polite, and helpful customer support assistant for SupportAI. Provide concise and clear answers."
          },
          ...((history).map(m => ({
            role: m.isBot ? "assistant" : "user",
            content: m.content
          }))),
          { role: "user", content: message }
        ],
      });

      aiResponse = completion.choices[0].message.content;
    }

    const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Save bot message
    const botMsg = await MsgDb.create({
      chatId: isMongoConnected ? currentChat._id : currentChat._id,
      content: aiResponse,
      isBot: true,
      timestamp: aiTimestamp
    });

    // Update chat last message
    currentChat.lastMessage = aiResponse;
    currentChat.updatedAt = Date.now();
    
    if (isMongoConnected) {
      await currentChat.save();
    } else {
      await ChatDb.save(currentChat);
    }

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

// Serve static frontend natively for a unified single local link
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Unified Server is running on port ${PORT}`);
    console.log(`Access the full app at: http://localhost:${PORT}`);
  });
}

module.exports = app;
