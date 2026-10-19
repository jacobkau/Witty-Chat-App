// socket.js - Socket.io client setup

import { io } from 'socket.io-client';
import { useEffect, useState, useMemo } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [username, setUsername] = useState('');
  const [currentRoom, setCurrentRoom] = useState('General');
  const [availableRooms, setAvailableRooms] = useState(['General']);

  // Connect to socket server
  const connect = (user) => {
    setUsername(user);
    setConnectionStatus('connecting');
    socket.auth = { username: user };
    socket.connect();
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
  };

  // Send a message
  const sendMessage = (message) => {
    socket.emit('send_message', { message });
  };

  // Send a private message
  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  // Set typing status
  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
  };
  
  // Search messages
  const searchMessages = (query) => {
    return messages.filter(msg =>
      msg.message && msg.message.toLowerCase().includes(query.toLowerCase())
    );
  };

  // New function to send reactions
  const sendReaction = (messageId, reaction) => {
    socket.emit('react_to_message', { messageId, reaction });
  };

  const uploadFile = async (file) => {
    if (!username || !socket.id) {
      console.error('Cannot upload file without a valid user session.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);
    formData.append('socketId', socket.id);

    try {
      const response = await fetch(`${SOCKET_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.statusText}`);
      }
      // The server will emit 'receive_message', so no need to handle response data here
    } catch (error) {
      console.error('Error uploading file:', error);
      // Optionally, update UI to show error
    }
  };

  const joinRoom = (roomName) => {
    socket.emit('join_room', roomName);
    setCurrentRoom(roomName);
    setMessages([]); // Clear messages when switching rooms
  };
  
  const createRoom = (roomName) => {
    socket.emit('create_room', roomName);
    joinRoom(roomName); // Automatically join the new room
  };

  // Socket event listeners
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    };
    const onDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
    const onReceiveMessage = (message) => setMessages(prev => [...prev, message]);
    const onUserList = (userList) => setUsers(userList);
    const onTypingUsers = (typing) => setTypingUsers(typing);

    // New listener for message updates (e.g., reactions)
    const onMessageUpdated = ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    const onRoomList = (rooms) => setAvailableRooms(rooms);
    const onMessageHistory = (history) => {
      setMessages(history);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onReceiveMessage);
    socket.on('user_list', onUserList);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_updated', onMessageUpdated); // Listen for updates
    socket.on('room_list', onRoomList); // Listen for room list updates
    socket.on('message_history', onMessageHistory); // Listen for history

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onReceiveMessage);
      socket.off('user_list', onUserList);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_updated', onMessageUpdated); // Clean up listener
      socket.off('room_list', onRoomList);
      socket.off('message_history', onMessageHistory); // Clean up listener
    };
  }, []);

  return {
    socket,
    isConnected,
    messages,
    users,
    typingUsers,
    connectionStatus,
    username,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    searchMessages,
    sendReaction,
    uploadFile,
    currentRoom,
    availableRooms,
    joinRoom,
    createRoom,
  };
};

export default socket; 