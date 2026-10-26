import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './socket/socket';
import { ThemeContext, useTheme } from './context/ThemeContext';
import { Trash2, Paperclip, Moon, Sun, Menu, X, Hand, MessageCircle, LogOut, UserX, Loader2, ArrowLeft } from 'lucide-react';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

const ReactionPicker = ({ onSelect }) => (
  <div className="flex gap-1 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-md">
    {EMOJI_REACTIONS.map((emoji) => (
      <button key={emoji} type="button" className="hover:scale-125 transition-transform text-lg px-1 leading-none" onClick={() => onSelect(emoji)}>
        {emoji}
      </button>
    ))}
  </div>
);

const RoomsPanel = ({ rooms, current, onJoin, onCreate, handleDeleteRoom, isOpen, onClose, myId, myEmail }) => {
  const [newRoom, setNewRoom] = useState('');

  const handleCreate = () => {
    if (newRoom.trim()) {
      onCreate(newRoom.trim());
      setNewRoom('');
    } else {
      alert('Room name is required!');
    }
  };

  const handleRoomClick = (room) => {
    if (room.name === current) return;
    if (room.creatorId === myId || room.name === 'General') {
      onJoin(room.name);
    } else {
      const code = window.prompt(`Enter secret code for ${room.name}:`);
      if (code) onJoin(room.name, code);
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-60 bg-gray-800 text-gray-100 p-5 flex flex-col border-r border-gray-700 transform transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-5 md:block">
          <h3 className="text-xl font-bold">WittyChat</h3>
          <button onClick={onClose} className="md:hidden text-gray-300 hover:text-white p-1 rounded hover:bg-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* PUBLIC ROOM */}
          <div>
            <strong className="text-xs uppercase tracking-wide text-gray-400 mb-2 block">Public Room</strong>
            <ul className="space-y-1">
              <li
                onClick={() => handleRoomClick({ name: 'General', creatorId: 'system' })}
                className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition ${current === 'General' ? 'bg-blue-600 font-bold' : 'hover:bg-gray-700'}`}
              >
                <span className="truncate">🌍 General</span>
              </li>
            </ul>
          </div>

          {/* CUSTOM ROOMS */}
          <div>
            <strong className="text-xs uppercase tracking-wide text-gray-400 mb-2 block">Custom Rooms</strong>
            <ul className="space-y-1">
              {rooms.filter(r => r.name !== 'General').map((room) => (
                <li
                  key={room.name}
                  onClick={() => handleRoomClick(room)}
                  className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition ${room.name === current ? 'bg-blue-600 font-bold' : 'hover:bg-gray-700'}`}
                >
                  <span className="truncate">{room.name}</span>
                  {room.creatorId === myId && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.name); }} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CREATE ROOM */}
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-600">
          <input
            type="text"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            placeholder="New room name..."
            className="w-full px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none text-sm"
          />
          <button onClick={handleCreate} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold transition mt-1">
            Create Room
          </button>
          <p className="text-xs text-gray-400 text-center mt-1">
            Secret code will be emailed to <strong>{myEmail}</strong>.
          </p>
        </div>
      </div>
    </>
  );
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(ts) {
  if (!ts) return 'UNKNOWN DATE';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'UNKNOWN DATE';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return 'TODAY';
  if (isYesterday) return 'YESTERDAY';
  
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function AppWrapper() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('theme') || 'light';
    return 'light';
  });

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <App />
    </ThemeContext.Provider>
  );
}

function App() {
  const {
    socket, username, isConnected, messages, users, typingUsers, connectionStatus,
    connect, disconnect, sendMessage, sendPrivateMessage, sendReaction, uploadFile,
    currentRoom, availableRooms, joinRoom, createRoom, deleteRoom, myId, myEmail, deleteAccount
  } = useSocket();

  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [secretCode, setSecretCode] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [privateRecipient, setPrivateRecipient] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then((p) => setNotificationsEnabled(p === 'granted'));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== socket?.id && !lastMessage.system) {
        if (notificationsEnabled && document.hidden) {
          new Notification(`New message from ${lastMessage.sender}`, {
            body: lastMessage.fileUrl ? 'Sent a file' : lastMessage.message,
          });
        }
        audioRef.current?.play().catch(() => {});
      }
    }
  }, [messages, notificationsEnabled, socket?.id]);

  useEffect(() => {
    if (!socket) return;
    const handleRoomDeleted = (deletedRoom) => {
      if (currentRoom === deletedRoom) {
        joinRoom('General');
        alert(`Room '${deletedRoom}' was deleted. You have been moved to General.`);
      }
    };
    socket.on('room_deleted', handleRoomDeleted);
    return () => socket.off('room_deleted', handleRoomDeleted);
  }, [currentRoom, joinRoom, socket]);

  const handleDeleteRoom = (room) => {
    if (window.confirm(`Are you sure you want to delete the room '${room}'?`)) {
      deleteRoom(room);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginName.trim() && loginEmail.trim() && secretCode.trim()) {
      connect(loginName, loginEmail, secretCode);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      if (privateRecipient) sendPrivateMessage(privateRecipient, chatInput);
      else sendMessage(chatInput);
      setChatInput('');
    }
  };

  const handleReaction = (messageId, reaction) => {
    sendReaction(messageId, reaction);
    setActivePicker(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to leave WittyChat? Your account and email will be deleted, but your messages will remain.")) {
      deleteAccount();
    }
  };

  const handleLeaveRoom = () => {
    joinRoom('General');
    setPrivateRecipient(''); 
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">
            Welcome to WittyChat!
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Secure real-time messaging.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              placeholder="Email Address (Unique)"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Secret Membership Code"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={connectionStatus === 'connecting'}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-md flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {connectionStatus === 'connecting' ? (
                <><Loader2 className="animate-spin" size={20} /> Connecting...</>
              ) : ('Join WittyChat')}
            </button>
          </form>
          <p className="text-center text-gray-400 text-sm mt-6">
            Status: {connectionStatus}
          </p>
        </div>
      </div>
    );
  }

  // Determine active title based on mode
  const activeTitle = privateRecipient 
    ? `Private: ${users.find(u => u.id === privateRecipient)?.username || 'User'}` 
    : currentRoom;

  let lastRenderedDate = null;

  return (
    <div className="h-screen grid grid-cols-1 md:grid-cols-[240px_1fr] bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 overflow-hidden">
      <RoomsPanel
        rooms={availableRooms}
        current={currentRoom}
        isOpen={isMobileMenuOpen}
        myId={myId}
        myEmail={myEmail}
        onClose={() => setIsMobileMenuOpen(false)}
        handleDeleteRoom={handleDeleteRoom}
        onJoin={(room, code) => { 
          joinRoom(room, code); 
          setPrivateRecipient(''); 
          setIsMobileMenuOpen(false); 
        }}
        onCreate={(room) => { 
          createRoom(room); 
          setIsMobileMenuOpen(false); 
        }}
      />

      <div className="flex flex-col h-screen min-w-0">
        <header className="px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden mr-3 text-gray-700 dark:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <Menu size={22} />
            </button>
            
            {/* Back Button if not in General */}
            {currentRoom !== 'General' && !privateRecipient && (
              <button onClick={() => handleLeaveRoom()} className="mr-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center text-sm font-semibold">
                <ArrowLeft size={16} className="mr-1" /> Back
              </button>
            )}

            <h2 className="text-lg md:text-xl font-bold truncate flex items-center gap-2">
              {privateRecipient ? (
                <><MessageCircle size={20} className="text-blue-500" /> {activeTitle}</>
              ) : (
                <>WittyChat: <span className="text-blue-600 dark:text-blue-400">{activeTitle}</span></>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <Hand size={14} className="text-yellow-500" />
              {username}
            </span>
            <button onClick={toggleTheme} className="p-2 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        <div className="flex flex-row flex-1 overflow-hidden">
          {/* SIDEBAR: ONLINE USERS & DMs */}
          <aside className="hidden sm:flex flex-col w-48 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 overflow-y-auto">
            <strong className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Direct Messages ({users.length})
            </strong>
            <ul className="space-y-1">
              {users.filter(u => u.id !== socket?.id).map((u) => (
                <li
                  key={u.id}
                  onClick={() => setPrivateRecipient(privateRecipient === u.id ? '' : u.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition ${u.id === privateRecipient ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="truncate">{u.username}</span>
                </li>
              ))}
              {users.length === 1 && (
                <li className="text-xs text-gray-400 text-center mt-2">No other users online</li>
              )}
            </ul>
          </aside>

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 w-full flex flex-col">
              
              {messages.map((msg) => {
                // Filter messages based on mode
                const isSent = msg.senderEmail === myEmail;
                const isSystem = msg.sender === 'System';
                if (privateRecipient) {
                   const isMyPrivateMsg = msg.isPrivate && (
                     (msg.senderId === socket.id && msg.to === privateRecipient) || 
                     (msg.senderId === privateRecipient && msg.to === socket.id)
                   );
                   if (!isMyPrivateMsg) return null;
                } else {
                   if (msg.isPrivate) return null;
                }

                const rawDate = msg.createdAt || msg.id || new Date().toISOString();
                const dateObj = new Date(rawDate);
                const msgDate = isNaN(dateObj.getTime()) ? 'Unknown Date' : dateObj.toDateString();
                
                const showDateDivider = msgDate !== lastRenderedDate;
                if (showDateDivider) lastRenderedDate = msgDate;

                return (
                  <React.Fragment key={msg._id || msg.id || Math.random()}>
                    {showDateDivider && (
                      <div className="flex justify-center my-4 w-full">
                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-4 py-1 rounded-full font-semibold uppercase tracking-wider shadow-sm">
                          {formatDateDivider(rawDate)}
                        </span>
                      </div>
                    )}

                    {isSystem ? (
                      <div className="text-center my-3 w-full">
                        <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 italic text-xs px-3 py-1 rounded-full">
                          {msg.message}
                        </span>
                      </div>
                    ) : (
                      <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] w-fit ${isSent ? 'self-end flex-row-reverse' : 'self-start flex-row'}`}>
                        <div className="w-9 h-9 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-sm flex-shrink-0" title={msg.sender}>
                          {getInitials(msg.sender)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className={`text-xs font-bold mb-1 ${isSent ? 'text-right text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {isSent ? 'You' : msg.sender}
                          </div>
                          <div className={`px-3 py-2 rounded-2xl shadow-sm break-words ${isSent ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-200 dark:border-gray-700'}`}>
                            {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                            {msg.fileUrl && (msg.fileType?.startsWith('image') || msg.fileType?.includes('jpg') || msg.fileType?.includes('png') ? (
                              <img src={msg.fileUrl} alt={msg.fileName} onClick={() => window.open(msg.fileUrl, '_blank')} className="max-w-full max-h-72 rounded-lg mt-1 cursor-pointer" />
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 underline font-bold">
                                <Paperclip size={14} />
                                {msg.fileName || 'Download File'}
                              </a>
                            ))}
                          </div>
                          <div className={`flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500 ${isSent ? 'justify-end' : 'justify-start'}`}>
                            <span>{formatTime(rawDate)}</span>
                            {msg.reactions && Object.entries(msg.reactions).map(([reaction, reactors]) => reactors.length > 0 && (
                              <span key={reaction} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
                                {reaction} {reactors.length}
                              </span>
                            ))}
                          </div>
                          {activePicker === msg._id && !msg.fileUrl && (
                            <ReactionPicker onSelect={(emoji) => handleReaction(msg._id, emoji)} />
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 md:px-4 py-3">
              {typingUsers.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-1">
                  {typingUsers.join(', ')} is typing...
                </div>
              )}
              
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={privateRecipient ? `Message ${users.find((u) => u.id === privateRecipient)?.username}...` : 'Type a message...'}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                />
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Paperclip size={18} />
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-sm transition">
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button onClick={handleLeaveRoom} className="flex-1 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2">
            <LogOut size={16} /> {privateRecipient ? 'Back to Room' : 'Leave Room'}
          </button>
          <button onClick={handleDeleteAccount} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2">
            <UserX size={16} /> Leave App & Delete Account
          </button>
        </div>
      </div>
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT" />
    </div>
  );
}

export default AppWrapper;
