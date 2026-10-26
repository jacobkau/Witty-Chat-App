import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';
import emailjs from '@emailjs/browser';

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
  const [myEmail, setMyEmail] = useState('');
  const [currentRoom, setCurrentRoom] = useState('General');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [myId, setMyId] = useState('');

  const connect = (user, email, secretCode) => {
    setUsername(user);
    setMyEmail(email);
    setConnectionStatus('connecting');
    socket.auth = { username: user, email, secretCode };
    socket.connect();
  };

  const disconnect = () => {
    socket.disconnect();
    setIsConnected(false);
    setUsername('');
    setMyEmail('');
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
            room: currentRoom,
            email: myEmail, 
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

  const deleteAccount = () => {
    socket.emit('request_account_deletion');
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

    const onRoomCreatedSuccess = ({ roomName, secretCode, creatorEmail, creatorName }) => {
      const templateParams = {
        from_name: 'WittyChat System',
        to_email: creatorEmail,
        subject: `Your Secret Code for Room: ${roomName}`,
        message: `Hello ${creatorName},\n\nYou have successfully created the room "${roomName}".\n\nYour secret code is: ${secretCode}\n\nShare this code with anyone you want to invite.`,
      };

      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      emailjs.send(serviceId, templateId, templateParams, publicKey)
        .then(() => alert(`Room created! The secret code has been emailed to ${creatorEmail}.`))
        .catch(() => alert(`Room created! Failed to send email.\n\nYour secret code is: ${secretCode}`));
    };

    const onAccountDeleted = ({ email, username }) => {
      const templateParams = {
        from_name: 'WittyChat System',
        to_email: email,
        subject: `Goodbye from WittyChat, ${username}`,
        message: `Hello ${username},\n\nWe're sad to see you go. Your account has been successfully deleted from our database. Your chat messages will remain visible to others.\n\nThank you for using WittyChat.`,
      };

      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      emailjs.send(serviceId, templateId, templateParams, publicKey)
        .catch((err) => console.error('Failed to send goodbye email:', err));
        
      alert('Your account has been deleted. You have left WittyChat.');
      window.location.reload();
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
    socket.on('account_deleted_success', onAccountDeleted);

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
      socket.off('account_deleted_success', onAccountDeleted);
    };
  }, []);

  return {
    socket, isConnected, messages, users, typingUsers, connectionStatus, username, myEmail, myId,
    connect, disconnect, sendMessage, sendPrivateMessage, sendReaction, uploadFile,
    currentRoom, availableRooms, joinRoom, createRoom, deleteRoom, deleteAccount,
  };
};

export default socket;
