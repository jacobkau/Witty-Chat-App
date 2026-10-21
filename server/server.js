const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Message = require('./models/Message');
const User = require('./models/User');
const Room = require('./models/Room');

dotenv.config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    const generalExists = await Room.findOne({ name: 'General' });
    if (!generalExists) {
      await Room.create({ name: 'General', creatorId: 'system', creatorName: 'System', secretCode: 'public' });
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

// --- Socket Authentication (Unique Email & Secret App Code) ---
io.use(async (socket, next) => {
  const { username, email, secretCode } = socket.handshake.auth;

  // App-level secret code check
  if (secretCode !== process.env.CHAT_SECRET_CODE) {
    return next(new Error('Invalid Secret Membership Code.'));
  }

  if (!username || !email) {
    return next(new Error('Username and Email are required.'));
  }

  try {
    let user = await User.findOne({ email });

    if (user) {
      if (user.isOnline) return next(new Error('This email is already logged in.'));
      user.username = username;
      user.isOnline = true;
      user.socketId = socket.id;
      await user.save();
    } else {
      user = await User.create({ username, email, isOnline: true, socketId: socket.id });
    }

    socket.username = user.username;
    socket.email = user.email;
    socket.room = 'General';
    next();
  } catch (error) {
    console.error(error);
    next(new Error('Database error during login.'));
  }
});

// --- Cloudinary Upload Route ---
app.post('/upload', async (req, res) => {
  try {
    const { file, username, socketId, room } = req.body;
    
    // Upload base64 string to Cloudinary
    const result = await cloudinary.uploader.upload(file, {
      folder: 'witty_chat_uploads',
    });

    const message = new Message({
      sender: username,
      senderId: socketId,
      room: room,
      fileUrl: result.secure_url,
      fileName: result.original_filename,
      fileType: result.format,
    });
    
    await message.save();
    io.to(room).emit('receive_message', message.toObject());
    res.status(201).json({ message: 'File uploaded successfully', data: message.toObject() });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).send('Server error during file upload.');
  }
});

// --- Helpers ---
const getUsersInRoom = (room) => {
  const roomSockets = io.sockets.adapter.rooms.get(room);
  if (!roomSockets) return [];
  return Array.from(roomSockets).map(socketId => {
    const userSocket = io.sockets.sockets.get(socketId);
    return { id: userSocket.id, username: userSocket.username };
  });
};

// --- Socket Connection ---
io.on('connection', async (socket) => {
  socket.join(socket.room);

  // Send current rooms (excluding secret codes for privacy)
  const rooms = await Room.find({}, '-secretCode');
  socket.emit('room_list', rooms);
  io.to(socket.room).emit('user_list', getUsersInRoom(socket.room));

  const history = await Message.find({ room: socket.room }).sort({ createdAt: -1 }).limit(50).lean();
  socket.emit('message_history', history.reverse());

  socket.broadcast.to(socket.room).emit('receive_message', {
    sender: 'System', message: `${socket.username} has joined the chat`, _id: new Date().toISOString(),
  });

  // CREATE ROOM
  socket.on('create_room', async ({ roomName, secretCode }) => {
    if (!secretCode || secretCode.trim() === '') {
      return socket.emit('room_error', 'Room must have a secret code.');
    }

    const exists = await Room.findOne({ name: roomName });
    if (exists) return socket.emit('room_error', 'Room name already taken.');

    await Room.create({
      name: roomName,
      creatorId: socket.id,
      creatorName: socket.username,
      secretCode: secretCode,
    });

    const updatedRooms = await Room.find({}, '-secretCode');
    io.emit('room_list', updatedRooms);
  });

  // JOIN ROOM
  socket.on('join_room', async ({ roomName, secretCode }) => {
    const room = await Room.findOne({ name: roomName });
    
    if (!room) return socket.emit('room_error', 'Room not found.');
    
    // Allow creator to bypass code, or verify the code
    if (room.creatorId !== socket.id && room.secretCode !== secretCode) {
      return socket.emit('room_error', 'Incorrect secret code for this room.');
    }

    socket.leave(socket.room);
    socket.room = roomName;
    socket.join(roomName);
    
    const history = await Message.find({ room: roomName }).sort({ createdAt: -1 }).limit(50).lean();
    socket.emit('message_history', history.reverse());
    io.to(roomName).emit('user_list', getUsersInRoom(roomName));
    socket.emit('room_joined', roomName);
  });

  // DELETE ROOM
  socket.on('delete_room', async (roomName) => {
    if (roomName === 'General') return; 
    
    const room = await Room.findOne({ name: roomName });
    if (room && room.creatorId === socket.id) {
      await Room.deleteOne({ name: roomName });
      const updatedRooms = await Room.find({}, '-secretCode');
      io.emit('room_list', updatedRooms);
      
      const roomSockets = io.sockets.adapter.rooms.get(roomName);
      if (roomSockets) {
        for (const sId of roomSockets) {
          const s = io.sockets.sockets.get(sId);
          if (s) {
            s.leave(roomName);
            s.join('General');
            s.room = 'General';
            s.emit('room_deleted', roomName);
            const history = await Message.find({ room: 'General' }).sort({ createdAt: -1 }).limit(50).lean();
            s.emit('message_history', history.reverse());
            io.to('General').emit('user_list', getUsersInRoom('General'));
          }
        }
      }
      await Message.deleteMany({ room: roomName });
    }
  });

  // MESSAGES
  socket.on('send_message', async (data) => {
    const message = new Message({
      sender: socket.username,
      senderId: socket.id,
      message: data.message,
      room: socket.room,
    });
    await message.save();
    io.to(socket.room).emit('receive_message', message.toObject());
  });

  socket.on('private_message', ({ to, message }) => {
    const msgPayload = {
      sender: socket.username, senderId: socket.id, message, isPrivate: true, _id: new Date().toISOString(),
    };
    socket.to(to).emit('receive_message', msgPayload);
    socket.emit('receive_message', msgPayload);
  });

  // REACTIONS
  socket.on('react_to_message', async ({ messageId, reaction }) => {
    const message = await Message.findById(messageId);
    if (!message) return;
    const userList = message.reactions.get(reaction) || [];
    const idx = userList.indexOf(socket.username);
    if (idx > -1) userList.splice(idx, 1); else userList.push(socket.username);
    message.reactions.set(reaction, userList);
    await message.save();
    io.to(message.room).emit('message_updated', { messageId, reactions: Object.fromEntries(message.reactions) });
  });

  socket.on('disconnect', async () => {
    await User.findOneAndUpdate({ socketId: socket.id }, { isOnline: false, socketId: null });
    io.to(socket.room).emit('user_list', getUsersInRoom(socket.room));
    io.to(socket.room).emit('receive_message', {
      sender: 'System', message: `${socket.username} has left the chat`, _id: new Date().toISOString(),
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
