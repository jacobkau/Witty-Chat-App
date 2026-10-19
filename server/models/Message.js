const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    senderId: { type: String, required: true },
    message: { type: String, required: false },
    room: { type: String, required: true, default: 'General' },
    isPrivate: { type: Boolean, default: false },
    reactions: {
      type: Map,
      of: [String], // Maps emoji to a list of usernames
      default: () => new Map(),
    },
    fileUrl: { type: String, required: false },
    fileName: { type: String, required: false },
    fileType: { type: String, required: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 