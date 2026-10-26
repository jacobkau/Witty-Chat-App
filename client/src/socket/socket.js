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
    setConnectionStatus('disconnected');
    setMessages([]); 
  };

  const sendMessage = (message) => socket.emit('send_message', { message });
  
  // 🚨 FIX: Send toEmail instead of toSocketId
  const sendPrivateMessage = (toEmail, message) => socket.emit('private_message', { toEmail, message });
  
  const sendReaction = (messageId, reaction) => socket.emit('react_to_message', { messageId, reaction });
  const pinMessage = (messageId) => socket.emit('pin_message', { messageId });
  const starMessage = (messageId) => socket.emit('star_message', { messageId });
  const deleteMessage = (messageId) => socket.emit('delete_message', { messageId });
  const clearChat = (withUserId) => socket.emit('clear_chat', { withUserId });

  const uploadFile = async (file, privateRecipientEmail = null) => {
    if (!username || !socket.id) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const response = await fetch(`${SOCKET_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64String,
            username,
            socketId: socket.id,
            room: currentRoom,
            email: myEmail,
            isPrivate: !!privateRecipientEmail,
            to: privateRecipientEmail 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }
        
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Upload failed: ${error.message}`);
      }
    };
  };

  const joinRoom = (roomName, secretCode = '') => {
    socket.emit('join_room', { roomName, secretCode });
    setCurrentRoom(roomName);
  };

  const createRoom = (roomName) => socket.emit('create_room', { roomName });
  const deleteRoom = (roomName) => socket.emit('delete_room', roomName);
  const deleteAccount = () => socket.emit('request_account_deletion');

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

    const onConnectError = (err) => {
      alert(`Login Failed: ${err.message}`);
      setConnectionStatus('error');
      socket.disconnect();
    };

    const onReceiveMessage = (message) => setMessages(prev => [...prev, message]);
    const onUserList = (userList) => setUsers(userList);
    const onTypingUsers = (typing) => setTypingUsers(typing);

    const onMessageUpdated = ({ messageId, reactions, isPinned, isStarred, deletedFor }) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          return {
            ...msg,
            ...(reactions !== undefined && { reactions }),
            ...(isPinned !== undefined && { isPinned }),
            ...(isStarred !== undefined && { isStarred }),
            ...(deletedFor !== undefined && { deletedFor }),
          };
        }
        return msg;
      }));
    };

    const onChatCleared = () => {
      setMessages(prev => prev.filter(msg => !msg.isPrivate));
    };

    const onRoomList = (rooms) => setAvailableRooms(rooms);
    
    const onMessageHistory = (history) => {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m._id || m.id));
        const newMessages = history.filter(m => !existingIds.has(m._id || m.id));
        return [...prev, ...newMessages]; 
      });
    };

    const onRoomError = (msg) => alert(msg);
    const onRoomJoined = (roomName) => { 
      setCurrentRoom(roomName); 
    };

    const onRoomCreatedSuccess = ({ roomName, secretCode, creatorEmail, creatorName }) => {
      const templateParams = {
        from_name: 'WittyChat System',
        to_email: creatorEmail,
        subject: `Your Secret Code for Room: ${roomName}`,
        message: `Hello ${creatorName},\n\nYou created "${roomName}".\n\nSecret code: ${secretCode}`,
      };
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

      emailjs.send(serviceId, templateId, templateParams, publicKey)
        .then(() => alert(`Room created! Code emailed to ${creatorEmail}.`))
        .catch(() => alert(`Room created! Failed to send email.\n\nYour code: ${secretCode}`));
    };

    const onAccountDeleted = ({ email, username }) => {
      const templateParams = {
        from_name: 'WittyChat System',
        to_email: email,
        subject: `Goodbye from WittyChat, ${username}`,
        message: `Hello ${username},\n\nYour account has been deleted.`,
      };
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

      emailjs.send(serviceId, templateId, templateParams, publicKey).catch(() => {});
      alert('Your account has been deleted. You have left WittyChat.');
      window.location.reload();
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onReceiveMessage);
    socket.on('user_list', onUserList);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_updated', onMessageUpdated);
    socket.on('chat_cleared', onChatCleared);
    socket.on('room_list', onRoomList);
    socket.on('message_history', onMessageHistory);
    socket.on('room_error', onRoomError);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_created_success', onRoomCreatedSuccess);
    socket.on('account_deleted_success', onAccountDeleted);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onReceiveMessage);
      socket.off('user_list', onUserList);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_updated', onMessageUpdated);
      socket.off('chat_cleared', onChatCleared);
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
    pinMessage, starMessage, deleteMessage, clearChat,
  };
};

export default socket;
