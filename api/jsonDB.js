const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

const defaultData = {
  users: [{
    _id: 'default_user_1',
    name: 'Tharun Bandla',
    email: 'tharun@example.com',
    avatar: 'TB'
  }],
  chats: [],
  messages: [],
  faqs: []
};

let memoryData = null;

function readDB() {
  if (memoryData) return memoryData;
  
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    } catch (e) {
      console.warn('⚠️  Read-only filesystem detected. Using in-memory store.');
      memoryData = JSON.parse(JSON.stringify(defaultData));
      return memoryData;
    }
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return defaultData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    // On Vercel, we just keep it in memory for the life of the lambda
    memoryData = data;
  }
}

const jsonDB = {
  faqs: {
    find: async () => readDB().faqs,
    create: async (data) => {
      const db = readDB();
      const newFaq = { _id: Date.now().toString(), ...data, createdAt: new Date().toISOString() };
      db.faqs.push(newFaq);
      writeDB(db);
      return newFaq;
    },
    findByIdAndUpdate: async (id, data) => {
      const db = readDB();
      const index = db.faqs.findIndex(f => f._id === id);
      if (index !== -1) {
        db.faqs[index] = { ...db.faqs[index], ...data, updatedAt: Date.now() };
        writeDB(db);
        return db.faqs[index];
      }
      return null;
    },
    findByIdAndDelete: async (id) => {
      const db = readDB();
      db.faqs = db.faqs.filter(f => f._id !== id);
      writeDB(db);
      return true;
    }
  },
  users: {
    findOne: async (query) => {
      const db = readDB();
      return db.users.find(u => Object.keys(query).every(k => u[k] === query[k]));
    },
    create: async (data) => {
      const db = readDB();
      const newUser = { _id: Date.now().toString(), ...data, createdAt: new Date().toISOString() };
      db.users.push(newUser);
      writeDB(db);
      return newUser;
    },
    findByIdAndUpdate: async (id, data) => {
      const db = readDB();
      const index = db.users.findIndex(u => u._id === id);
      if (index !== -1) {
        db.users[index] = { ...db.users[index], ...data, updatedAt: Date.now() };
        writeDB(db);
        return db.users[index];
      }
      return null;
    }
  },
  chats: {
    find: async (query) => {
      const db = readDB();
      let results = db.chats;
      if (query && query.userId) {
        results = results.filter(c => c.userId === query.userId);
      }
      // Populate logic (simple mock)
      return results.map(c => ({
        ...c,
        userId: db.users.find(u => u._id === c.userId)
      })).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },
    findById: async (id) => readDB().chats.find(c => c._id === id),
    create: async (data) => {
      const db = readDB();
      const newChat = { _id: Date.now().toString(), ...data, updatedAt: Date.now() };
      db.chats.push(newChat);
      writeDB(db);
      return newChat;
    },
    save: async (chat) => {
      const db = readDB();
      const index = db.chats.findIndex(c => c._id === chat._id);
      if (index !== -1) {
        db.chats[index] = { ...chat, updatedAt: Date.now() };
        writeDB(db);
      }
    }
  },
  messages: {
    find: async (query) => {
      const db = readDB();
      return db.messages.filter(m => m.chatId === query.chatId).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    },
    create: async (data) => {
      const db = readDB();
      const newMsg = { _id: Date.now().toString(), ...data, createdAt: new Date().toISOString() };
      db.messages.push(newMsg);
      writeDB(db);
      return newMsg;
    }
  }
};

module.exports = jsonDB;
