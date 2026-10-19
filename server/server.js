// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { randomUUID } = require('crypto');
const connectDB = require('./config/db');
const Message = require('./models/Message');
const multer = require('multer');
const fs = require('fs');

// Load environment variables
dotenv.config();
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- File Upload Setup ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { username, socketId } = req.body;
    if (!file || !username || !socketId) {
      return res.status(400).send('Missing file or user information.');
    }
    
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

    const message = new Message({
      sender: username,
      senderId: socketId,
      fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
    });
    
    await message.save();
    io.emit('receive_message', message.toObject());
    
    res.status(201).json({ message: 'File uploaded successfully', data: message.toObject() });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).send('Server error during file upload.');
  }
});
// --- End File Upload Setup ---

// In-memory data stores
let messages = [];
const typingUsers = {};

// --- Room Management ---
let availableRooms = ['General', 'Technology', 'Random'];
const getRooms = () => Array.from(io.sockets.adapter.rooms);
// --- End Room Management ---

// Middleware for authentication
io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  if (!username) return next(new Error('invalid username'));
  socket.username = username;
  socket.room = 'General'; // Default room
  next();
});

const getUsersInRoom = (room) => {
  const roomSockets = io.sockets.adapter.rooms.get(room);
  if (!roomSockets) return [];
  return Array.from(roomSockets).map(socketId => {
    const userSocket = io.sockets.sockets.get(socketId);
    return { id: userSocket.id, username: userSocket.username };
  });
};

// Socket.io connection handler
io.on('connection', async (socket) => {
  console.log(`${socket.username} (${socket.id}) connected`);
  socket.join(socket.room);

  // Send initial data to the connected client
  socket.emit('room_list', availableRooms);
  io.to(socket.room).emit('user_list', getUsersInRoom(socket.room));

  try {
    const history = await Message.find({ room: socket.room }).sort({ createdAt: -1 }).limit(50).lean();
    socket.emit('message_history', history.reverse());
  } catch (error) {
    console.error(`Error fetching history for room ${socket.room}:`, error);
  }

  socket.broadcast.to(socket.room).emit('receive_message', {
    sender: 'System',
    message: `${socket.username} has joined the chat`,
    _id: new Date().toISOString(),
  });

  socket.on('join_room', async (roomName) => {
    // Leave previous room
    socket.broadcast.to(socket.room).emit('user_list', getUsersInRoom(socket.room).filter(u => u.id !== socket.id));
    socket.leave(socket.room);
    
    // Join new room
    socket.room = roomName;
    socket.join(roomName);
    
    // Send history and user list for the new room
    const history = await Message.find({ room: roomName }).sort({ createdAt: -1 }).limit(50).lean();
    socket.emit('message_history', history.reverse());
    io.to(roomName).emit('user_list', getUsersInRoom(roomName));
  });
  
  socket.on('create_room', (roomName) => {
    if (!availableRooms.includes(roomName)) {
      availableRooms.push(roomName);
      io.emit('room_list', availableRooms); // Notify all clients of the new room
    }
  });

  socket.on('delete_room', async (roomName) => {
    if (roomName === 'General') return; // Don't allow deleting General
    availableRooms = availableRooms.filter(r => r !== roomName);
    io.emit('room_list', availableRooms);
    // Notify users in the deleted room to switch to General
    const roomSockets = io.sockets.adapter.rooms.get(roomName);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const s = io.sockets.sockets.get(socketId);
        if (s) {
          s.leave(roomName);
          s.join('General');
          s.room = 'General';
          s.emit('room_deleted', roomName);
          // Send new history and user list
          const history = await Message.find({ room: 'General' }).sort({ createdAt: -1 }).limit(50).lean();
          s.emit('message_history', history.reverse());
          io.to('General').emit('user_list', getUsersInRoom('General'));
        }
      }
    }
    // Delete all messages in the deleted room
    await Message.deleteMany({ room: roomName });
  });

  socket.on('send_message', async (data) => {
    const message = new Message({
      sender: socket.username,
      senderId: socket.id,
      message: data.message,
      room: socket.room, // Save message to the current room
    });
    await message.save();
    io.to(socket.room).emit('receive_message', message.toObject());
  });

  socket.on('private_message', ({ to, message }) => {
    const msgPayload = {
      sender: socket.username,
      senderId: socket.id,
      message,
      isPrivate: true,
      _id: new Date().toISOString(), // Private messages need a unique key
    };
    socket.to(to).emit('receive_message', msgPayload);
    socket.emit('receive_message', msgPayload);
  });

  // Handle message reactions
  socket.on('react_to_message', async ({ messageId, reaction }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const userList = message.reactions.get(reaction) || [];
      const userIndex = userList.indexOf(socket.username);

      if (userIndex > -1) {
        userList.splice(userIndex, 1);
      } else {
        userList.push(socket.username);
      }
      
      message.reactions.set(reaction, userList);
      await message.save();
      
      // Emit update to the specific room
      io.to(message.room).emit('message_updated', { messageId, reactions: Object.fromEntries(message.reactions) });
    } catch (error) {
      console.error('Error reacting to message:', error);
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (isTyping) {
      typingUsers[socket.username] = true;
    } else {
      delete typingUsers[socket.username];
    }
    io.emit('typing_users', Object.keys(typingUsers));
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`${socket.username} (${socket.id}) disconnected`);
    io.to(socket.room).emit('user_list', getUsersInRoom(socket.room).filter(u => u.id !== socket.id));
    io.to(socket.room).emit('receive_message', {
      sender: 'System',
      message: `${socket.username} has left the chat`,
      _id: new Date().toISOString(),
    });
  });
});

// API routes
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(typingUsers));
});

// Search messages API
app.get('/api/messages/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json([]);
  }
  
  const searchResults = messages.filter(msg => 
    msg.message && msg.message.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json(searchResults);
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io }; 