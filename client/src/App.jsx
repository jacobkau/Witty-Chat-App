import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './socket/socket';
import { getStyles, lightColors, darkColors } from './styles';
import { ThemeContext, useTheme } from './context/ThemeContext';
import { useWindowSize } from './hooks/useWindowSize';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

// Reaction Picker Component
const ReactionPicker = ({ onSelect, styles }) => (
  <div style={styles.reactionPicker}>
    {EMOJI_REACTIONS.map(emoji => (
      <button key={emoji} style={styles.reactionButton} onClick={() => onSelect(emoji)}>
        {emoji}
      </button>
    ))}
  </div>
);

const RoomsPanel = ({ rooms, current, onJoin, onCreate, styles, handleDeleteRoom }) => {
  const [newRoom, setNewRoom] = useState('');

  const handleCreate = () => {
    if (newRoom.trim()) {
      onCreate(newRoom.trim());
      setNewRoom('');
    }
  };

  return (
    <div style={styles.roomsPanel}>
      <h3 style={styles.roomsHeader}>Chat Rooms</h3>
      <ul style={styles.roomsList}>
        {rooms.map(room => (
          <li
            key={room}
            style={room === current ? styles.activeRoom : styles.roomItem}
            onClick={() => onJoin(room)}
          >
            # {room}
            {room !== 'General' && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff4d4f',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  float: 'right',
                }}
                title={`Delete ${room}`}
                onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room); }}
              >
                🗑️
              </button>
            )}
          </li>
        ))}
      </ul>
      <div style={styles.createRoomContainer}>
        <input
          type="text"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
          placeholder="New room name..."
          style={styles.createRoomInput}
        />
        <button onClick={handleCreate} style={styles.createRoomButton}>+</button>
      </div>
    </div>
  );
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AppWrapper() {
  const [theme, setTheme] = useState('light');
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <App />
    </ThemeContext.Provider>
  );
}

function App() {
  const {
    socket,
    username,
    isConnected,
    messages,
    users,
    typingUsers,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    sendReaction,
    uploadFile,
    currentRoom,
    availableRooms,
    joinRoom,
    createRoom,
    deleteRoom, // Make sure this is exposed from useSocket
  } = useSocket();

  const [loginInput, setLoginInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [privateRecipient, setPrivateRecipient] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const { width } = useWindowSize();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = width < 768;
  
  const styles = getStyles(theme);
  const colors = theme === 'light' ? lightColors : darkColors;

  const roomsPanelStyle = {
    ...styles.roomsPanel,
    ...(isMobile && {
      position: 'absolute',
      zIndex: 100,
      transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s ease-in-out',
      height: '100%',
    })
  };

  const mainPanelStyle = {
    ...styles.mainPanel,
    ...(isMobile && { gridColumn: '1 / -1' })
  };

  const appContainerStyle = {
    ...styles.appContainer,
    gridTemplateColumns: isMobile ? '1fr' : '240px 1fr',
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => setNotificationsEnabled(p === 'granted'));
    }
  }, []);

  // Auto-scroll to new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle new messages and notifications
  useEffect(() => {
    if (messages.length) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== socket.id && !lastMessage.system) {
        setUnreadCount(prev => prev + 1);
        if (notificationsEnabled && document.hidden) {
          new Notification(`New message from ${lastMessage.sender}`, {
            body: msg.fileUrl ? (msg.fileType?.startsWith('image/') ? 'Sent an image' : 'Sent a file') : msg.message,
          });
        }
        audioRef.current?.play().catch(console.error);
      }
    }
  }, [messages, notificationsEnabled, socket?.id]);

  useEffect(() => {
    const handleRoomDeleted = (deletedRoom) => {
      if (currentRoom === deletedRoom) {
        joinRoom('General');
        alert(`Room '${deletedRoom}' was deleted. You have been moved to #General.`);
      }
    };
    socket.on('room_deleted', handleRoomDeleted);
    return () => socket.off('room_deleted', handleRoomDeleted);
  }, [currentRoom, joinRoom, socket]);

  const handleDeleteRoom = (room) => {
    if (window.confirm(`Are you sure you want to delete the room '${room}'? This will remove all its messages.`)) {
      deleteRoom(room); // Use the function from the hook
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginInput.trim()) {
      connect(loginInput);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      if (privateRecipient) {
        sendPrivateMessage(privateRecipient, chatInput);
      } else {
        sendMessage(chatInput);
      }
      setChatInput('');
    }
  };

  const handleReaction = (messageId, reaction) => {
    sendReaction(messageId, reaction);
    setActivePicker(null);
  };

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchResults(searchMessages(searchQuery));
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Login UI
  if (!isConnected) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Welcome to QuickChat!</h1>
          <p className="login-subtitle">
            A real-time chat application built with React and Socket.io.
          </p>
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              placeholder="Enter your username"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="login-input"
              required
            />
            <button type="submit" className="login-button">Join Chat</button>
          </form>
          <p className="login-status">Status: {connectionStatus}</p>
        </div>
      </div>
    );
  }

  // Main Chat UI
  return (
    <>
      <style>
        {`
          @keyframes popIn {
            0% { transform: scale(0.5); opacity: 0; }
            80% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
      <div style={appContainerStyle}>
        <RoomsPanel
          rooms={availableRooms}
          current={currentRoom}
          styles={styles}
          handleDeleteRoom={handleDeleteRoom}
          onJoin={(room) => {
            joinRoom(room);
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          onCreate={(room) => {
            createRoom(room);
            if (isMobile) setIsMobileMenuOpen(false);
          }}
        />
        <div style={mainPanelStyle}>
          <header style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {isMobile && (
                  <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={styles.mobileMenuButton}>
                    ☰
                  </button>
                )}
                <h2 style={{ margin: 0 }}>QuickChat: #{currentRoom}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '20px' }}>Welcome, {username}!</span>
                <button onClick={toggleTheme} style={{
                  background: 'none',
                  border: `1px solid ${styles.border}`,
                  borderRadius: '20px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  color: styles.text,
                }}>
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
              </div>
            </div>
          </header>
          <div style={styles.chatWindow}>
            <div style={styles.usersContainer}>
              <strong>Online Users ({users.length})</strong>
              <ul style={styles.userList}>
                {users.map((u) => (
                  u.id !== socket.id && (
                    <li
                      key={u.id}
                      onClick={() => setPrivateRecipient(privateRecipient === u.id ? '' : u.id)}
                      style={{
                        ...styles.userListItem,
                        backgroundColor: u.id === privateRecipient ? colors.primary : 'transparent',
                        color: u.id === privateRecipient ? colors.white : colors.text,
                      }}
                    >
                      {u.username}
                    </li>
                  )
                ))}
              </ul>
            </div>

            <div style={styles.messagesContainer}>
              <div style={styles.messagesList} ref={messagesEndRef}>
                {messages.map((msg) => {
                  const isSent = msg.senderId === socket.id;
                  const isSystem = msg.sender === 'System';
                  return (
                    <div
                      key={msg._id || msg.id}
                      style={{
                        ...styles.messageBubble,
                        ...(isSent ? styles.bubbleSent : styles.bubbleReceived),
                        ...(isSystem ? styles.bubbleSystem : {}),
                        alignSelf: isSent ? 'flex-end' : 'flex-start',
                        margin: '10px 0',
                        display: 'flex',
                        flexDirection: isSent ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        maxWidth: '80%',
                      }}
                    >
                      {!isSystem && (
                        <div style={styles.avatar} title={msg.sender}>
                          {getInitials(msg.sender)}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        {!isSystem && (
                          <div style={styles.senderName}>{isSent ? 'You' : msg.sender}</div>
                        )}
                        <div style={{
                          ...styles.bubbleContent,
                          background: isSent ? styles.bubbleSent.background : styles.bubbleReceived.background,
                          color: isSent ? styles.bubbleSent.color : styles.bubbleReceived.color,
                          borderBottomRightRadius: isSent ? '4px' : '18px',
                          borderBottomLeftRadius: isSent ? '18px' : '4px',
                        }}>
                          {msg.message}
                          {msg.fileUrl && (
                            msg.fileType?.startsWith('image/') ? (
                              <img src={msg.fileUrl} alt={msg.fileName} style={styles.imageAttachment} onClick={() => window.open(msg.fileUrl, '_blank')} />
                            ) : (
                              <div style={styles.fileAttachment}>
                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={styles.fileAttachment_link}>
                                  📎 {msg.fileName || 'Download File'}
                                </a>
                              </div>
                            )
                          )}
                        </div>
                        <div style={styles.bubbleMeta}>
                          <span>{formatTime(msg.createdAt)}</span>
                          {/* Reactions Display */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <span style={styles.reactionsContainer}>
                              {Object.entries(msg.reactions).map(([reaction, reactors]) =>
                                reactors.length > 0 && (
                                  <span key={reaction} style={styles.reactionDisplay}>
                                    {reaction} {reactors.length}
                                  </span>
                                )
                              )}
                            </span>
                          )}
                        </div>
                        {/* Reaction Picker - only show for text messages */}
                        {activePicker === msg._id && !msg.fileUrl && (
                          <ReactionPicker
                            styles={styles}
                            onSelect={(emoji) => handleReaction(msg._id, emoji)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.inputArea}>
                {typingUsers.length > 0 && (
                  <div style={{ color: colors.textSecondary, marginBottom: '5px', fontSize: '0.9em' }}>
                    {typingUsers.join(', ')} is typing...
                  </div>
                )}
                <form onSubmit={handleSend} style={{display: 'flex', flex: 1}}>
                  <input
                    type="text"
                    placeholder={privateRecipient ? `Message ${users.find(u => u.id === privateRecipient)?.username}...` : 'Type a message...'}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={styles.chatInput}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button type="button" onClick={triggerFileInput} style={styles.fileButton}>
                    📎
                  </button>
                  <button type="submit" style={styles.sendButton}>Send</button>
                </form>
              </div>
            </div>
          </div>
          <button onClick={disconnect} style={{...styles.sendButton, backgroundColor: colors.danger, marginTop: '10px' }}>
            Leave Chat
          </button>
        </div>
        <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT" />
      </div>
    </>
  );
}

export default AppWrapper;