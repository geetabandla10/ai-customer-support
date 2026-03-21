const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const OpenAI = require('openai');
const path = require('path');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
}

const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const FAQ = require('./models/FAQ');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.ATLAS_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-support';

// Initialize OpenAI using OpenRouter (with dummy fallback to prevent fatal startup crash)
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || 'dummy_key_to_prevent_fatal_crash',
  defaultHeaders: {
    "HTTP-Referer": "https://ai-customer-support-orcin-gamma.vercel.app",
    "X-Title": "SupportAI",
  }
});

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.url}`);
  next();
});

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
    global.lastMongoError = err.message;
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

const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID_FALLBACK = '853185526172-sb7e5lmlvlnd72sojm4t0ldsi5m7jebp.apps.googleusercontent.com';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK);

// --- STATUS ROUTE ---
app.get('/api/status', (req, res) => {
  const mongoUriSource = process.env.MONGODB_URI ? 
    (process.env.MONGODB_URI.includes('your_mongodb_uri') ? 'placeholder' : 'actual') : 'none';
    
  res.json({
    storage: isMongoConnected ? 'mongodb' : 'json',
    environment: process.env.NODE_ENV || 'development',
    mongoError: global.lastMongoError || null,
    mongoUriStatus: mongoUriSource,
    mongoUriPreview: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 15) + '...' : 'N/A',
    aiKeyPresent: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY)
  });
});

// --- AUTH ROUTES ---
app.post(['/api/auth/google', '/auth/google'], async (req, res) => {
  try {
    const { credential, email: mockEmail, name: mockName, picture: mockPicture } = req.body;
    
    let email, name, picture;

    // Use Google ID Token if provided, else fallback to mock (for demo/guest)
    if (credential) {
      try {
        const authClientId = process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;
        console.log(`🔐 Verifying token with Client ID: ${authClientId}`);
        
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: authClientId,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
        console.log(`✅ Verified: ${email}`);
      } catch (verifyError) {
        console.error('❌ Google Token Verification Failed:', verifyError.message);
        return res.status(401).json({ error: 'Invalid Google token', details: verifyError.message });
      }
    } else {
      // Mock/Guest Fallback
      email = mockEmail;
      name = mockName;
      picture = mockPicture;
    }

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const UserDb = getDb('User');
    
    // Try to find existing user
    let user = await UserDb.findOne({ email });
    
    if (!user) {
      // Create new user from Google profile
      const avatar = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
      if (isMongoConnected && mongoose.connection.readyState === 1) {
        user = await User.create({ name, email, avatar, picture });
      } else {
        user = await jsonDB.users.create({ name, email, avatar, picture });
      }
      console.log(`✅ New user created: ${email}`);
    } else {
      // Update picture if it changed
      if (picture && user.picture !== picture) {
        if (isMongoConnected && mongoose.connection.readyState === 1) {
          user = await User.findByIdAndUpdate(user._id, { picture }, { new: true });
        } else {
          user.picture = picture;
        }
      }
      console.log(`👋 Returning user logged in: ${email}`);
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

    let user = await UserDb.findOne({ email });
    if (!user) {
      user = await UserDb.create({
        name: email.split('@')[0],
        email: email,
        avatar: email.substring(0, 2).toUpperCase()
      });
    }

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

      try {
        const completion = await openai.chat.completions.create({
          model: "google/gemini-2.0-flash-lite-preview-02-05:free",
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
      } catch (aiErr) {
        console.error('AI API Error:', aiErr.message);
        console.error('AI Error details:', aiErr);
        
        const errorNote = `[DEBUG] AI Error: ${aiErr.message}. `;
        
        // --- UPGRADED INTELLIGENT MOCK ENGINE ---
        const msg = message.toLowerCase();
        const words = msg.split(/\W+/).filter(w => w.length > 2);
        
        // 1. Try Scoring FAQs by word overlap
        let bestMatch = null;
        let highestScore = 0;
        
        const allFaqs = await FaqDb.find();
        allFaqs.forEach(faq => {
          const faqWords = faq.question.toLowerCase().split(/\W+/);
          const score = words.filter(w => faqWords.includes(w)).length;
          if (score > highestScore) {
            highestScore = score;
            bestMatch = faq;
          }
        });
        
        if (highestScore > 0 && bestMatch) {
          aiResponse = errorNote + bestMatch.answer;
        } 
        // 2. Pattern-based responses for common intents
        else if (msg.includes('hello') || msg.includes('hi ') || msg === 'hi') {
          aiResponse = errorNote + "Hello! I'm your SupportAI assistant. I'm currently running in a smart offline mode while my AI core is being updated, but I can still answer your questions!";
        } else if (msg.includes('price') || msg.includes('cost') || msg.includes('pack') || msg.includes('pay')) {
          aiResponse = errorNote + "Our pricing starts at $19/month for the Basic tier. We also have a $49/month Pro tier for high-volume support. Which one would you like to know more about?";
        } else if (msg.includes('help') || msg.includes('support') || msg.includes('contact')) {
          aiResponse = errorNote + "I'm here to help! You can ask me about our features, pricing, or setup process. If you need to speak to a human, you can email us at support@example.com.";
        } else if (msg.includes('setup') || msg.includes('install') || msg.includes('use')) {
          aiResponse = errorNote + "Setting up SupportAI is simple. You just need to include our client SDK in your project and initialize it with your API key. Would you like the documentation link?";
        } else if (msg.includes('api') || msg.includes('credit') || msg.includes('err')) {
          aiResponse = errorNote + "I've detected a connectivity issue with our main AI provider (Credits needed). I'm currently assisting you using my built-in knowledge base! Is there something specific in the FAQ I can help with?";
        } else {
          // 3. Dynamic Fallback to avoid repetition
          const fallbacks = [
            "That's an interesting question! Could you tell me a bit more so I can find the best answer for you?",
            "I'm scanning our knowledge base for that... in the meantime, could you specify if this is a technical or a billing question?",
            "I'm here to assist! Since I'm in optimized local mode, could you try rephrasing that or checking our FAQ section?",
            "I want to make sure I give you the right info. Are you asking about our features or how to get started?"
          ];
          aiResponse = errorNote + fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
      }
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
if (require.main === module) { 
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
 
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Unified Server is running on port ${PORT}`);
    console.log(`Access the full app at: http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
