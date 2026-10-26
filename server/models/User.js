const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, 
  email: { type: String, required: true, unique: true },
  isOnline: { type: Boolean, default: false },
  socketId: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
