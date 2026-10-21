import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/$/, '');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [username, setUsername] = useState('');
  const [currentRoom, setCurrentRoom] = useState('General');
  // Rooms is now an object/array with creator info instead of just a string
  const [availableRooms, setAvailableRooms] = useState([{ name: 'General', creatorId: 'system' }]);
  const [myId, setMyId] = useState('');

  // Connect takes credentials now
  const connect = (username, email, secretCode) => {
    setUsername(username);
    setConnectionStatus('connecting');
    socket.auth = { username, email, secretCode };
    socket.connect();
  };

  const disconnect = () => {
    socket.disconnect();
    setIsConnected(false);
    setUsername('');
  };

  const sendMessage = (message) => {
    socket.emit('send_message', { message });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  const sendReaction = (messageId, reaction) => {
    socket.emit('react_to_message', { messageId, reaction });
  };

  const uploadFile = async (file) => {
    if (!username || !socket.id) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);
    formData.append('socketId', socket.id);

    try {
      await fetch(`${SOCKET_URL}/upload`, { method: 'POST', body: formData });
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const joinRoom = (roomName) => {
    socket.emit('join_room', roomName);
    setCurrentRoom(roomName);
    setMessages([]);
  };

  const createRoom = (roomName) => {
    socket.emit('create_room', roomName);
    joinRoom(roomName);
  };

  const deleteRoom = (roomName) => {
    socket.emit('delete_room', roomName);
  };

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setMyId(socket.id);
    };
    const onDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
    
    // Handle Auth Errors from Server
    const onAuthError = (msg) => {
      alert(msg);
      setConnectionStatus('error');
      socket.disconnect();
    };

    const onReceiveMessage = (message) => setMessages(prev => [...prev, message]);
    const onUserList = (userList) => setUsers(userList);
    const onTypingUsers = (typing) => setTypingUsers(typing);

    const onMessageUpdated = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, reactions } : msg));
    };

    const onRoomList = (rooms) => setAvailableRooms(rooms);
    const onMessageHistory = (history) => setMessages(history);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('auth_error', onAuthError); // New listener
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onReceiveMessage);
    socket.on('user_list', onUserList);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_updated', onMessageUpdated);
    socket.on('room_list', onRoomList);
    socket.on('message_history', onMessageHistory);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('auth_error', onAuthError);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onReceiveMessage);
      socket.off('user_list', onUserList);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_updated', onMessageUpdated);
      socket.off('room_list', onRoomList);
      socket.off('message_history', onMessageHistory);
    };
  }, []);

  return {
    socket, isConnected, messages, users, typingUsers, connectionStatus, username, myId,
    connect, disconnect, sendMessage, sendPrivateMessage, sendReaction, uploadFile,
    currentRoom, availableRooms, joinRoom, createRoom, deleteRoom,
  };
};

export default socket;
