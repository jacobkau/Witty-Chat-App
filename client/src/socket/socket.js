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
  const [availableRooms, setAvailableRooms] = useState([]);
  const [myId, setMyId] = useState('');

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
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        await fetch(`${SOCKET_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64String,
            username: username,
            socketId: socket.id,
            room: currentRoom
          }),
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    };
  };

  const joinRoom = (roomName, secretCode = '') => {
    socket.emit('join_room', { roomName, secretCode });
  };

  
  const createRoom = (roomName) => {
    socket.emit('create_room', { roomName });
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
    const onRoomError = (msg) => alert(msg);
    
    const onRoomJoined = (roomName) => {
      setCurrentRoom(roomName);
      setMessages([]);
    };

    // Handle email success message
    const onRoomCreatedSuccess = ({ roomName, message }) => {
      alert(message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('auth_error', onAuthError);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onReceiveMessage);
    socket.on('user_list', onUserList);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_updated', onMessageUpdated);
    socket.on('room_list', onRoomList);
    socket.on('message_history', onMessageHistory);
    socket.on('room_error', onRoomError);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_created_success', onRoomCreatedSuccess); 

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
      socket.off('room_error', onRoomError);
      socket.off('room_joined', onRoomJoined);
      socket.off('room_created_success', onRoomCreatedSuccess);
    };
  }, []);

  return {
    socket, isConnected, messages, users, typingUsers, connectionStatus, username, myId,
    connect, disconnect, sendMessage, sendPrivateMessage, sendReaction, uploadFile,
    currentRoom, availableRooms, joinRoom, createRoom, deleteRoom,
  };
};

export default socket;
