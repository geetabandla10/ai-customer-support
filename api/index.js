const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const OpenAI = require('openai');
const path = require('path');
const multer = require('multer');
const pdfjsLib = require('pdfjs-dist/build/pdf.js');
const supabase = require('./supabaseClient');
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

// Detect if a key is an OpenRouter key or a standard OpenAI key
const isOpenRouterKey = (key) => key && key.startsWith('sk-or-v1-');

// Initialize OpenAI for Chat (Smart Detection)
const primaryKey = process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build';
const isORForChat = isOpenRouterKey(primaryKey);

const openai = new OpenAI({
  apiKey: primaryKey,
  baseURL: isORForChat ? "https://openrouter.ai/api/v1" : undefined,
  defaultHeaders: isORForChat ? {
    "HTTP-Referer": "https://ai-customer-support.app",
    "X-Title": "AI Customer Support",
  } : undefined
});

// Standard OpenAI client for Embeddings (Smart Detection)
const isRealOpenAILocal = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
const isOREmbed = isOpenRouterKey(process.env.OPENAI_API_KEY) || isOpenRouterKey(process.env.OPENROUTER_API_KEY);

const openaiEmbeddings = new OpenAI({
  apiKey: isRealOpenAILocal ? process.env.OPENAI_API_KEY : process.env.OPENROUTER_API_KEY,
  baseURL: isOREmbed ? "https://openrouter.ai/api/v1" : undefined
});

/**
 * Extract text from PDF buffer using pdfjs-dist
 */
async function extractTextFromPDF(buffer) {
  try {
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      useSystemFonts: true,
      stopAtErrors: false,
      isEvalSupported: false,
      disableFontFace: true
    });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      text += strings.join(' ') + '\n';
    }
    return text;
  } catch (err) {
    throw new Error(`PDF engine failed to process the file. ${err.message}`);
  }
}

/**
 * Splits text into chunks of roughly min-max words with optional overlap.
 */
function chunkText(text, minWords = 500, maxWords = 800, overlapWords = 50) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunkWords = words.slice(i, i + maxWords);
    chunks.push(chunkWords.join(' '));
    if (i + maxWords >= words.length) break;
    i += (maxWords - overlapWords);
  }
  return chunks;
}

app.use(cors());
app.use(express.json());

// Configure Multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Request Logger
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.url}`);
  next();
});

let isMongoConnected = false;

// Connect to MongoDB
const mongoPromise = mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
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

// Middleware: wait for MongoDB connection attempt to finish before handling API requests
app.use('/api', async (req, res, next) => {
  if (req.path === '/status') return next(); // skip for status route
  try { await mongoPromise; } catch (e) { /* handled above */ }
  next();
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
const GOOGLE_CLIENT_ID_FALLBACK = '863379789902-fa455rs1s1smppabbdqob0h7ca0612b5.apps.googleusercontent.com';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK);

// --- STATUS ROUTE ---
app.get('/api/status', async (req, res) => {
  try { await mongoPromise; } catch (e) { /* handled above */ }

  const uri = process.env.ATLAS_URI || process.env.MONGODB_URI;
  const mongoUriPrefix = uri ? uri.substring(0, 15) : 'N/A';
  const aiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const aiKeyPreview = aiKey ? aiKey.substring(0, 8) + '...' : 'none';
  
  res.json({
    storage: isMongoConnected ? 'mongodb' : 'json',
    mongoReadyState: mongoose.connection.readyState,
    environment: process.env.NODE_ENV || 'production',
    mongoError: global.lastMongoError || null,
    hasAtlasUri: !!process.env.ATLAS_URI,
    hasMongoUri: !!process.env.MONGODB_URI,
    mongoUriPreview: mongoUriPrefix + '...',
    aiKeyPresent: !!aiKey,
    aiKeyPreview: aiKeyPreview
  });
});

// --- STARTUP DIAGNOSTICS ---
if (require.main === module || process.env.VERCEL) {
  const activeID = process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;
  console.log(`🚀 [SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 [SERVER] Google Client ID active: ${activeID.substring(0, 15)}...`);
  console.log(`🗄️ [SERVER] MongoDB URI present: ${!!(process.env.ATLAS_URI || process.env.MONGODB_URI)}`);
}

// --- AUTH ROUTES ---
app.post(['/api/auth/google', '/auth/google'], async (req, res) => {
  try {
    const { credential, email: mockEmail, name: mockName, picture: mockPicture } = req.body;
    
    let email, name, picture;

    // Use Google ID Token if provided, else fallback to mock (for demo/guest)
    if (credential) {
      try {
        const authClientId = process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;
        console.log(`🔐 [AUTH] Verifying token for Client ID: ${authClientId.substring(0, 15)}...`);
        
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: authClientId,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
        console.log(`✅ [AUTH] Token verified for: ${email}`);
      } catch (verifyError) {
        console.error('❌ [AUTH] Token Verification Failed:', verifyError.message);
        return res.status(401).json({ 
          error: 'Verification failed', 
          details: verifyError.message,
          hint: 'Ensure GOOGLE_CLIENT_ID is set in Vercel Dashboard.'
        });
      }
    } else {
      // Mock/Guest Fallback
      email = mockEmail;
      name = mockName;
      picture = mockPicture;
    }

    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user;
    try {
      const UserDb = getDb('User');
      user = await UserDb.findOne({ email });
      
      if (!user) {
        const avatar = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
        if (isMongoConnected && mongoose.connection.readyState === 1) {
          user = await User.create({ name, email, avatar, picture });
        } else {
          user = await jsonDB.users.create({ name, email, avatar, picture });
        }
        console.log(`👤 [AUTH] New user created: ${email}`);
      } else {
        if (picture && user.picture !== picture) {
          if (isMongoConnected && mongoose.connection.readyState === 1) {
            user = await User.findByIdAndUpdate(user._id, { picture }, { new: true });
          } else {
            user.picture = picture;
          }
        }
        console.log(`👋 [AUTH] User logged in: ${email}`);
      }
    } catch (dbError) {
      console.error('❌ [AUTH] Database Error during login:', dbError.message);
      return res.status(500).json({ 
        error: 'Database error', 
        details: dbError.message,
        hint: 'Check if MongoDB Atlas has whitelisted 0.0.0.0/0'
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('❌ [AUTH] Global Auth Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- ADMIN ROUTES ---
app.get(['/api/admin/chats', '/admin/chats'], async (req, res) => {
  try {
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;

    const UserDb = getDb('User');
    const users = await UserDb.find();
    const userMap = Object.fromEntries(users.map(u => [u.email, u]));

    const mappedChats = chats.map(c => ({
      _id: c.id,
      userId: userMap[c.user_id] || { name: 'Unknown', email: c.user_id, avatar: 'U' },
      title: c.title,
      lastMessage: c.last_message,
      updatedAt: c.updated_at
    }));

    res.json(mappedChats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: All users with stats
app.get('/api/admin/users', async (req, res) => {
  try {
    const UserDb = getDb('User');
    const users = await UserDb.find();

    const { data: chats, error } = await supabase.from('chats').select('user_id');
    const chatCounts = {};
    if (!error && chats) {
      for (const chat of chats) {
        chatCounts[chat.user_id] = (chatCounts[chat.user_id] || 0) + 1;
      }
    }

    const { data: files } = await supabase.from('knowledge_base').select('user_id');
    const fileCounts = {};
    if (files) {
      for (const file of files) {
        fileCounts[file.user_id] = (fileCounts[file.user_id] || 0) + 1;
      }
    }

    const usersWithStats = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      picture: user.picture,
      chatCount: chatCounts[user.email] || 0,
      fileCount: fileCounts[user.email] || 0,
      createdAt: user.createdAt || user._id
    }));

    res.json(usersWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Analytics overview
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const UserDb = getDb('User');
    const users = await UserDb.find();

    const { count: totalChats } = await supabase.from('chats').select('*', { count: 'exact', head: true });
    const { count: totalQueries } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_bot', false);
    const { count: totalFiles } = await supabase.from('knowledge_base').select('*', { count: 'exact', head: true });

    res.json({
      totalUsers: users.length,
      totalChats: totalChats || 0,
      totalQueries: totalQueries || 0,
      totalFiles: totalFiles || 0,
      activeUsers: users.length // simplified active users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Messages for a specific chat
app.get('/api/admin/messages/:chatId', async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', req.params.chatId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.json(messages.map(m => ({
      _id: m.id,
      content: m.content,
      isBot: m.is_bot,
      timestamp: m.timestamp,
      sources: m.sources
    })));
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
  
  // --- KNOWLEDGE BASE ROUTES ---
  app.post('/api/upload-knowledge', upload.single('file'), async (req, res) => {
    console.log(`📤 [UPLOAD] Request received from ${req.body.email || 'unknown user'}`);
    try {
      const { email } = req.body;
      const file = req.file;
  
      if (!file) {
        console.warn('⚠️ [UPLOAD] No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
      }
      console.log(`📄 [UPLOAD] File: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);

      if (!email) {
        console.warn('⚠️ [UPLOAD] User email missing');
        return res.status(400).json({ error: 'User email is required' });
      }
  
      let content = '';
      if (file.mimetype === 'application/pdf') {
        try {
          content = await extractTextFromPDF(file.buffer);
          if (!content || content.trim().length < 10) {
            console.warn('⚠️ [UPLOAD] PDF content is empty or too short');
            return res.status(400).json({ error: 'PDF appears to be empty, scanned (image-only), or password-protected. Please upload a web-optimized PDF or a TXT file.' });
          }
          console.log(`✅ [UPLOAD] Successfully extracted ${content.length} characters from PDF`);
        } catch (pdfErr) {
          console.error('❌ [UPLOAD] PDF Extraction Error:', pdfErr.message);
          return res.status(400).json({ error: `Failed to read PDF: ${pdfErr.message}. If the file is encrypted or malformed, try converting it to a .txt file.` });
        }
      } else if (file.mimetype === 'text/plain') {
        content = file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Only PDF and TXT are allowed.' });
      }
  
      const { data, error } = await supabase
        .from('knowledge_base')
        .insert([
          { 
            file_name: file.originalname, 
            user_id: email, 
            content: content,
            file_type: file.mimetype === 'application/pdf' ? 'pdf' : 'txt'
          }
        ])
        .select();
  
      if (error) throw error;
      const fileId = data[0].id;

      // --- RAG PIPELINE: CHUNKING & EMBEDDINGS ---
      try {
        const chunks = chunkText(content, 500, 800, 50);
        console.log(`📦 Generated ${chunks.length} chunks for file ${fileId}`);

        const chunkData = [];
        for (const chunk of chunks) {
          // Generate embedding for current chunk
          const isRealOpenAILocal = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
          const embedModelName = isRealOpenAILocal ? "text-embedding-3-small" : "openai/text-embedding-3-small";
          
          let embedding = [];
          try {
            const embeddingResponse = await openaiEmbeddings.embeddings.create({
              model: embedModelName,
              input: chunk,
            });
            embedding = embeddingResponse.data[0].embedding;
          } catch (e) {
            console.error(`❌ Embedding failed for chunk: ${e.message}`);
            if (e.message.includes('402') || e.message.includes('credits')) {
              console.warn('⚠️ Using zero-vector fallback for embedding due to credit issues.');
              embedding = new Array(1536).fill(0); // Standard dimension for text-embedding-3-small
            } else {
              throw e;
            }
          }
          chunkData.push({
            file_id: fileId,
            user_id: email,
            content: chunk,
            embedding: embedding
          });
        }

        // Batch insert chunks into knowledge_chunks table
        const { error: chunkError } = await supabase
          .from('knowledge_chunks')
          .insert(chunkData);

        if (chunkError) {
          console.error('❌ Error storing chunks:', chunkError.message);
          // Don't fail the whole request, but log it
        } else {
          console.log(`✅ Stored ${chunks.length} chunks with embeddings in pgvector.`);
        }
      } catch (ragError) {
        console.error('❌ RAG Pipeline Error:', ragError.message);
      }
  
      res.json({ success: true, data: data[0] });
    } catch (error) {
      console.error('Upload Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/knowledge-base/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, file_name, upload_date, file_type')
        .eq('user_id', email)
        .order('upload_date', { ascending: false });
  
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Get all chats for a user
app.get(['/api/chats/:email', '/chats/:email'], async (req, res) => {
  try {
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', req.params.email)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    
    res.json(chats.map(c => ({
      _id: c.id,
      title: c.title,
      lastMessage: c.last_message,
      updatedAt: c.updated_at
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
app.get(['/api/messages/:chatId', '/messages/:chatId'], async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', req.params.chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(messages.map(m => ({
      _id: m.id,
      content: m.content,
      isBot: m.is_bot,
      timestamp: m.timestamp,
      sources: m.sources
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete(['/api/chats/:id', '/chats/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('chats').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint with Retrieval-Augmented Generation (RAG) & Streaming
app.post(['/api/chat', '/chat'], async (req, res) => {
  const { message, email, chatId, fileIds } = req.body;
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.error("❌ Chat API Error: OpenAI API key is missing or is the default placeholder.");
    return res.status(401).json({
      error: 'API key not configured',
    });
  }

  let currentChat;
  try {
    const UserDb = getDb('User');

    let user = await UserDb.findOne({ email });
    if (!user) {
      await UserDb.create({
        name: email.split('@')[0],
        email: email,
        avatar: email.substring(0, 2).toUpperCase()
      });
    }

    console.log("TRACE 1: Found user");

    if (chatId) {
      console.log("TRACE 2a: Selecting chat");
      const { data: chatData } = await supabase.from('chats').select('*').eq('id', chatId).single();
      currentChat = chatData;
      console.log("TRACE 2b: Selected chat");
    }

    if (!currentChat) {
      console.log("TRACE 3a: Inserting chat");
      const { data: newChat, error: newChatErr } = await supabase.from('chats').insert([{
        user_id: email,
        title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
        last_message: message,
        updated_at: new Date().toISOString()
      }]).select().single();
      
      if (newChatErr) {
        console.error("TRACE 3 ERR -> Supabase Insert Failed, Using Ephemeral Chat:", newChatErr.message || newChatErr);
        // Fallback to ephemeral chat to prevent 500 error
        currentChat = {
          id: 'ephemeral-' + Date.now(),
          user_id: email,
          title: 'Temporary Session (DB Offline)',
          last_message: message,
          is_ephemeral: true
        };
      } else {
        currentChat = newChat;
        console.log("TRACE 3b: Inserted chat");
      }
    } else {
      console.log("TRACE 4a: Updating chat");
      if (!currentChat.is_ephemeral) {
        await supabase.from('chats').update({
          last_message: message,
          updated_at: new Date().toISOString()
        }).eq('id', currentChat.id).catch(e => console.error("Chat update failed:", e.message));
      }
      console.log("TRACE 4b: Updated chat");
    }

    console.log("TRACE 5a: Inserting message");
    if (!currentChat.is_ephemeral) {
      await supabase.from('messages').insert([{
        chat_id: currentChat.id,
        user_id: email,
        content: message,
        is_bot: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]).catch(e => console.error("Message insert failed:", e.message));
      console.log("TRACE 5b: Inserted message");
    }

    // --- RAG PIPELINE ---
    console.log("TRACE 6: Starting RAG retrieval...");
    let contextText = "";
    let sources = [];
    try {
      // 1. Generate query embedding
      const isRealOpenAILocal = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
      const embedModelName = isRealOpenAILocal ? "text-embedding-3-small" : "openai/text-embedding-3-small";
      
      let queryEmbedding = [];
      try {
        console.log(`TRACE 6a: Generating embedding with ${embedModelName}`);
        const embeddingResponse = await openaiEmbeddings.embeddings.create({
          model: embedModelName,
          input: message,
        });
        queryEmbedding = embeddingResponse.data[0].embedding;
        console.log("TRACE 6b: Embedding generated");
      } catch (e) {
        console.error(`❌ Query embedding failed: ${e.message}`);
        queryEmbedding = new Array(1536).fill(0);
      }

      // 2. Vector Search via Supabase RPC
      console.log("TRACE 6c: Running Supabase RPC vector search...");
      const { data: chunks, error: rpcError } = await supabase.rpc('match_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.1, 
        match_count: 5,
        p_user_id: email,
        p_file_ids: (fileIds && fileIds.length > 0) ? fileIds : null
      });

      if (rpcError) {
        console.error("❌ RPC Search Error:", rpcError.message);
      } else if (chunks && chunks.length > 0) {
        console.log(`TRACE 6d: Found ${chunks.length} matching chunks`);
        contextText = chunks.map(c => c.content).join("\n\n---\n\n");

        // 3. Resolve filenames for sources
        const uniqueFileIds = [...new Set(chunks.map(c => c.file_id))];
        const { data: fileData, error: fileError } = await supabase
          .from('knowledge_base')
          .select('id, file_name')
          .in('id', uniqueFileIds);
          
        if (!fileError && fileData) {
          const fileMap = Object.fromEntries(fileData.map(f => [f.id, f.file_name]));
          sources = chunks.map(c => ({
            file_name: fileMap[c.file_id] || "Unknown File",
            content: c.content
          }));
        }
      } else if (fileIds && fileIds.length > 0) {
        // MANDATORY RAG FALLBACK: If user explicitly selected files but NO relevant data was found
        console.warn("TRACE 6d: No relevant data found for the selected documents");
        contextText = "No relevant information found in your documents";
      } else {
        console.log("TRACE 6d: No matching chunks found in general KB");
      }
    } catch (ragError) {
      console.error('❌ RAG Retrieval Error:', ragError.message);
    }

    // --- STREAMING RESPONSE ---
    console.log("TRACE 7: Preparing streaming response...");
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const systemPrompt = `You are a professional customer support assistant for SupportAI. 
Answer the user's question ONLY using the provided context below.
If the answer is not in the context, say "I don't know, please contact support for details."
Do not use your general knowledge to answer questions not covered by the context.

IMPORTANT: At the very end of your response, you MUST provide exactly 3 short follow-up questions the user might want to ask next. Format them EXACTLY like this:
---SUGGESTIONS---
- [Question 1]
- [Question 2]
- [Question 3]

Retrieved Context:
${contextText || "No context found in knowledge base."}`;

    // Production-ready AI logic using OpenAI gpt-4o-mini
    const MAX_RETRIES = 1;
    let attempt = 0;
    const TIMEOUT_MS = 30000; // 30s timeout for free models
    const GENERIC_ERROR = "Something went wrong. Please try again.";
    let fullAiResponse = "";

    const callAi = async () => {
      console.log(`TRACE 8: AI Request Attempt ${attempt + 1} for user ${email}`);
      console.log(`DEBUG: [REQ] User: ${email} | Message: ${message.substring(0, 50)}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const modelName = "gpt-4o-mini";
        console.log(`TRACE 8a: Calling OpenAI for ${email} with model ${modelName}...`);
        
      let stream;
      try {
        stream = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          stream: true,
        }, { signal: controller.signal });
        console.log("TRACE 8b: Stream opened successfully");
      } catch (err) {
        console.error("🎯 ISOLATED OPENAI ERROR:", String(err), "| Message:", err.message, "| Code:", err.code);
        throw err;
      }

        clearTimeout(timeoutId);

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            fullAiResponse += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }

        console.log("TRACE 8c: AI response complete, saving to DB...");

        // Persistence
        const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (!currentChat.is_ephemeral) {
          const { error: msgInsertErr } = await supabase.from('messages').insert([{
            chat_id: currentChat.id,
            user_id: email,
            content: fullAiResponse,
            is_bot: true,
            timestamp: aiTimestamp,
            sources: sources
          }]);
          
          if (msgInsertErr) console.error("❌ AI Message insert failed:", msgInsertErr.message);

          await supabase.from('chats').update({
            last_message: fullAiResponse,
            updated_at: new Date().toISOString()
          }).eq('id', currentChat.id).catch(e => {});
        }

        res.write(`data: ${JSON.stringify({ done: true, chatId: currentChat.id, timestamp: aiTimestamp, sources })}\n\n`);
        res.end();
        console.log("TRACE 8d: Response ended successfully");
      } catch (err) {
        clearTimeout(timeoutId);
        console.error(`❌ AI Attempt ${attempt + 1} failed:`, err.message, err.status || err.code || '');
        
        if (attempt < MAX_RETRIES) {
          attempt++;
          console.log(`🔄 Retrying AI call (Attempt ${attempt + 1})...`);
          return callAi(); 
        }
        throw err; 
      }
    };

    await callAi();

  } catch (error) {
    console.error('Final Chat Production Error Log:', {
      message: error.message,
      name: error.name,
      status: error.status,
      code: error.code,
      user: email,
      chatId: currentChat?.id,
      stack: error.stack?.split('\n').slice(0, 3).join(' ')
    });
    
    // Mask internal error for user
    const userFriendlyError = "Something went wrong. Please try again.";
    res.write(`data: ${JSON.stringify({ text: userFriendlyError, isError: true })}\n\n`);
    
    // Still persist the error state in DB for context if available
    const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (!currentChat?.is_ephemeral) {
      await supabase.from('messages').insert([{
        chat_id: currentChat?.id,
        user_id: email,
        content: userFriendlyError,
        is_bot: true,
        timestamp: aiTimestamp
      }]).catch(e => console.error(e));
    }

    res.write(`data: ${JSON.stringify({ done: true, chatId: currentChat?.id, timestamp: aiTimestamp, isError: true })}\n\n`);
    res.end();
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
