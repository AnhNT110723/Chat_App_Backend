const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
  room: String,
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
  isGroup: Boolean,
  seenBy: [{ type: String }]
});
module.exports = mongoose.model('Message', messageSchema);