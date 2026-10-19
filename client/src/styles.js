// client/src/styles.js

const lightColors = {
  primary: '#007bff',
  secondary: '#6c757d',
  background: '#f8f9fa',
  text: '#343a40',
  textSecondary: '#6c757d',
  border: '#dee2e6',
  white: '#ffffff',
  light: '#f1f3f5',
  success: '#28a745',
  danger: '#dc3545',
  roomPanelBg: '#343a40',
  roomPanelText: '#f8f9fa',
  roomActiveBg: '#007bff',
  bubbleSent: '#007bff',
  bubbleReceived: '#e9ecef',
  bubbleTextSent: '#fff',
  bubbleTextReceived: '#343a40',
};

const darkColors = {
  primary: '#339af0',
  secondary: '#adb5bd',
  background: '#181a1b',
  text: '#f1f3f5',
  textSecondary: '#adb5bd',
  border: '#23272b',
  white: '#23272b',
  light: '#23272b',
  success: '#51cf66',
  danger: '#ff6b6b',
  roomPanelBg: '#23272b',
  roomPanelText: '#f1f3f5',
  roomActiveBg: '#339af0',
  bubbleSent: '#339af0',
  bubbleReceived: '#23272b',
  bubbleTextSent: '#fff',
  bubbleTextReceived: '#f1f3f5',
};

function getStyles(theme = 'light') {
  const colors = theme === 'dark' ? darkColors : lightColors;
  return {
    ...colors,
    lightColors,
    darkColors,

    appContainer: {
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      height: '100vh',
      fontFamily: "'Inter', sans-serif",
      background: colors.background,
      color: colors.text,
    },
    roomsPanel: {
      background: colors.roomPanelBg,
      color: colors.roomPanelText,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      borderRight: `1px solid ${colors.border}`,
    },
    roomsHeader: {
      marginBottom: '20px',
      fontSize: '1.2rem',
      fontWeight: 'bold',
    },
    roomsList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      flexGrow: 1,
      overflowY: 'auto',
    },
    roomItem: {
      padding: '10px 12px',
      cursor: 'pointer',
      borderRadius: '5px',
      marginBottom: '5px',
      transition: 'background 0.2s',
    },
    activeRoom: {
      padding: '10px 12px',
      cursor: 'pointer',
      borderRadius: '5px',
      marginBottom: '5px',
      background: colors.roomActiveBg,
      fontWeight: 'bold',
    },
    createRoomContainer: {
      display: 'flex',
      marginTop: '15px',
      paddingTop: '15px',
      borderTop: `1px solid ${colors.secondary}`,
    },
    createRoomInput: {
      flex: 1,
      padding: '8px',
      border: 'none',
      borderRadius: '5px 0 0 5px',
      background: colors.light,
      color: colors.text,
    },
    createRoomButton: {
      padding: '8px 12px',
      border: 'none',
      background: colors.primary,
      color: colors.white,
      cursor: 'pointer',
      borderRadius: '0 5px 5px 0',
      fontSize: '1.2rem',
    },
    mainPanel: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    },
    header: {
      padding: '15px 20px',
      borderBottom: `1px solid ${colors.border}`,
      background: colors.white,
    },
    chatWindow: {
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '0 20px',
      overflowY: 'hidden',
    },
    // User list
    usersContainer: {
      minWidth: '180px',
      borderRight: `1px solid ${colors.border}`,
      padding: '10px',
      overflowY: 'auto',
      backgroundColor: colors.background,
    },
    userList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    userListItem: {
      padding: '8px',
      cursor: 'pointer',
      borderRadius: '4px',
      marginBottom: '5px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    
    // Messages area
    messagesContainer: {
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '10px',
    },
    messagesList: {
      flexGrow: 1,
      overflowY: 'auto',
      padding: '10px 20px',
      display: 'flex',
      flexDirection: 'column',
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: colors.secondary,
      color: colors.white,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      marginRight: '10px',
      flexShrink: 0,
    },
    messageBubble: {
      display: 'flex',
      marginBottom: '2px',
      maxWidth: '85%',
    },
    bubbleContent: {
      padding: '10px 15px',
      borderRadius: '18px',
      color: colors.bubbleTextSent,
      background: colors.bubbleSent,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    bubbleSent: {
      flexDirection: 'row-reverse',
      alignSelf: 'flex-end',
      '& $bubbleContent': {
        background: colors.bubbleSent,
        color: colors.bubbleTextSent,
        borderBottomRightRadius: '4px',
      },
      '& $avatar': {
        marginLeft: '10px',
        marginRight: 0,
      },
    },
    bubbleReceived: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      '& $bubbleContent': {
        background: colors.bubbleReceived,
        color: colors.bubbleTextReceived,
        borderBottomLeftRadius: '4px',
      },
    },
    bubbleSystem: {
      alignSelf: 'center',
      background: colors.light,
      color: colors.textSecondary,
      padding: '5px 10px',
      borderRadius: '10px',
      margin: '10px 0',
      fontStyle: 'italic',
      fontSize: '0.9rem',
    },
    senderName: {
      fontSize: '0.8rem',
      fontWeight: 'bold',
      marginBottom: '4px',
      color: colors.textSecondary,
    },
    bubbleMeta: {
      fontSize: '0.75rem',
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: '4px',
    },
    reactionsContainer: {
      display: 'inline-flex',
      gap: '5px',
      marginLeft: '10px',
    },
    reactionDisplay: {
      backgroundColor: colors.light,
      color: colors.text,
      padding: '2px 6px',
      borderRadius: '10px',
      fontSize: '0.8rem',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      animation: 'popIn 0.2s ease',
    },
    
    // Input area
    inputArea: {
      display: 'flex',
      padding: '10px 20px',
      borderTop: `1px solid ${colors.border}`,
      background: colors.white,
      alignItems: 'center',
    },
    chatInput: {
      flex: 1,
      padding: '10px 15px',
      border: `1px solid ${colors.border}`,
      borderRadius: '20px',
      marginRight: '10px',
      fontSize: '1rem',
    },
    fileButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      padding: '0 10px',
      color: colors.textSecondary,
      transition: 'color 0.2s',
    },
    sendButton: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '20px',
      background: colors.primary,
      color: colors.white,
      fontSize: '1rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    imageAttachment: {
      maxWidth: '100%',
      maxHeight: '300px',
      borderRadius: '15px',
      display: 'block',
      cursor: 'pointer',
    },
    fileAttachment: {
      padding: '15px',
      background: 'rgba(0,0,0,0.1)',
      borderRadius: '10px',
      border: `1px solid rgba(255,255,255,0.2)`,
      marginTop: '5px',
    },
    fileAttachment_link: {
      color: colors.white,
      textDecoration: 'underline',
      fontWeight: 'bold',
    },
    mobileMenuButton: {
      background: 'none',
      border: 'none',
      color: colors.text,
      fontSize: '1.5rem',
      cursor: 'pointer',
      marginRight: '15px',
    },
  };
}

export { getStyles, lightColors, darkColors };

// Add keyframes for animations outside the function
const keyframes = `
@keyframes popIn {
  0% { transform: scale(0.5); opacity: 0; }
  80% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
`;

// You'll need to inject these keyframes into your app, for example by adding a <style> tag. 