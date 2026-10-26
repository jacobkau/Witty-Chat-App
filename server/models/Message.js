const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    senderId: { type: String, required: true }, 
    senderEmail: { type: String, required: true },
    message: { type: String, required: false },
    room: { type: String, required: true, default: 'General' },
    isPrivate: { type: Boolean, default: false },
    to: { type: String, required: false }, 
    isPinned: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },
    deletedFor: [{ type: String }],
    reactions: { type: Map, of: [String], default: () => new Map() },
    fileUrl: { type: String, required: false },
    fileName: { type: String, required: false },
    fileType: { type: String, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
