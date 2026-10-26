# WittyChat

WittyChat is a real-time chat application built with React, Node.js, Socket.io, and MongoDB. It provides a secure, feature-rich messaging environment supporting both public community rooms and private direct messages. The application uses Cloudinary for file storage and EmailJS for automated email notifications.

## Features

### Core Functionality
- **Real-time Messaging:** Instant text communication powered by Socket.io.
- **Public and Private Channels:** A default "Community Chat" available to all users, plus the ability to create custom rooms.
- **Private Direct Messages:** One-on-one private conversations with unread message indicators.
- **Authentication:** Unique email and username enforcement to prevent duplicate accounts.
- **Session Management:** Prevents multiple simultaneous logins using the same email address.

### Media and File Sharing
- **Cloudinary Integration:** Secure storage and delivery of media files.
- **Intelligent File Rendering:**
  - Images display as inline previews.
  - PDFs render with an embedded viewer and download option.
  - Audio and Video files include native HTML5 players.
  - Documents and archives display as structured file cards.

### Message Management
- **Contextual Actions:** Right-click or tap messages to Reply, Copy, Pin, Star, Share, or Delete.
- **Reply Functionality:** Quote previous messages with clear visual formatting.
- **Date Dividers:** Messages are grouped chronologically with clear date separators (Today, Yesterday, etc.).
- **Message State:** Pin and Star states are synchronized across all connected clients in real-time.

### Room Security
- **Secret Codes:** Custom rooms require a unique secret code to join.
- **Automated Distribution:** Secret codes are automatically generated and emailed to the creator via EmailJS upon room creation.
- **Creator Privileges:** Only the creator of a room has the ability to delete it.

### Account Management
- **Account Deletion:** Users can permanently delete their account, removing their email from the database while preserving their message history for context.
- **Goodbye Notification:** Automated email confirmation sent upon account deletion.

## Technology Stack

### Frontend
- React 18
- Tailwind CSS
- Socket.io Client
- Lucide React (Icons)
- EmailJS Browser

### Backend
- Node.js
- Express
- Socket.io
- MongoDB with Mongoose
- Cloudinary (File Storage)
- Dotenv

## Prerequisites

Ensure you have the following installed and configured:
- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB instance
- Cloudinary account with API credentials
- EmailJS account with Service ID, Template ID, and Public Key

## Environment Variables

Create a `.env` file in the `server` directory and configure the following variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CHAT_SECRET_CODE=your_global_membership_code
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLIENT_URL=http://localhost:5173
```

For the client, create a `.env` file in the `client` directory:

```env
VITE_SOCKET_URL=http://localhost:5000
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
```

## Installation and Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/witty-chat-app.git
cd witty-chat-app
```

### 2. Backend Setup
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

## Deployment Notes

### Backend (Render)
- Set the environment variables in the Render dashboard.
- Ensure the build command is `npm install` and the start command is `node server.js`.
- Important: If using Cloudinary, you must enable "PDF and ZIP files delivery" in your Cloudinary Security Settings for document previews to function correctly in the browser.

### Frontend (Vercel)
- Set the environment variables in the Vercel project settings.
- The build command is `npm run build` and the output directory is `dist`.
- Ensure `VITE_SOCKET_URL` points to your deployed Render backend URL.

## Usage

1. **Registration/Login:** Enter a unique username, a valid email address, and the global chat membership code.
2. **Community Chat:** By default, you will join the "General" community room.
3. **Direct Messages:** Click on any user's avatar or name in the message list or the sidebar to initiate a private chat.
4. **Creating Rooms:** Use the input field at the bottom of the sidebar to create a new room. A secret code will be generated and sent to your email.
5. **Joining Rooms:** Click on a custom room in the sidebar. If it is not your room, you will be prompted to enter the secret code.

## License

This project is licensed under the MIT License.

## Live System
[live mode](https://witty-chat-app.vercel.app/)

### Build by [Witty Highbrow Technologies](https://witty-highbrow-technologies.onrender.com)
Contact us: [wittyhighbrowtechnologies@gmail.com](wittyhighbrowtechnologies@gmail.com)
