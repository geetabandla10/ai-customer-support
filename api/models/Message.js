const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  content: { type: String, required: true },
  isBot: { type: Boolean, default: false },
  timestamp: { type: String, required: true },
  sources: [{
    file_name: String,
    content: String
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', MessageSchema);
