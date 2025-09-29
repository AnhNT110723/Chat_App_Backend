# ChatApp Backend Real-Time 📡

## Overview

This project is the backend server for a real-time chat application. It handles user authentication, real-time messaging for both private (one-on-one) and group chats, group management (create, delete, add/kick members), message history, and seen status updates. The server uses Socket.IO for real-time communication and MongoDB for persistent storage.

The application supports features like automatic joining of group rooms, system notifications for group events, and efficient handling of online users and groups via in-memory caching with database synchronization.

## Technologies Used 🛠️

- **Node.js**: Runtime environment.
- **Express.js**: Web framework for handling HTTP requests.
- **Socket.IO**: For real-time, bidirectional communication between clients and server.
- **MongoDB & Mongoose**: Database for storing users, groups, and messages.
- **bcryptjs**: For secure password hashing.
- **uuid**: For generating unique IDs for groups and sessions.
- **dotenv**: For managing environment variables.
- **cors**: For handling cross-origin requests.

## Project Structure 📂
```
Chat_App_Backend/
├── config/             # Configuration files (e.g., database connection)
├── models/             # Mongoose models (e.g., User, Message, Group)
├── routes/             # API routes (e.g., auth.js for registration/login)
├── socket/             # Socket.IO handlers (e.g., handler.js for event logic)
├── .gitignore          # Git ignore file
├── package-lock.json   # NPM lock file
├── package.json        # Project dependencies and scripts
├── server.js           # Main server entry point
└── README.md           # This file
```

## Features ✨
 
- **User Authentication**: Register and login with hashed passwords.
- **Real-Time Messaging**: Send/receive messages instantly in private chats or groups.
- **Group Management**:
  - Create groups with members.
  - Delete groups (only by creator).
  - Add new members to groups.
  - Kick members from groups.
- **Message History**: Load previous messages for any chat room.
- **Seen Status**: Mark messages as seen and notify participants in real-time.
- **Online User Tracking**: Maintain a list of connected users and emit updates.
- **System Messages**: Automatic notifications for group creation, member additions/kicks.
- **Database Integration**: All data (groups, messages) persisted in MongoDB.
- **Error Handling**: Basic error emissions for invalid actions (e.g., unauthorized group deletion).

## Installation

1. **Clone the Repository**:
git clone <repository-url>
cd Chat_App_Backend


2. **Install Dependencies**:
npm install

3. **Set Up Environment Variables**:
Create a `.env` file in the root directory with the following:
MONGO_URI=mongodb://<your-mongo-uri>  # MongoDB connection string
PORT=5000                             # Server port (default: 5000)
FRONTEND_URL=https://chat-app-frontend-olive-psi.vercel.app  # Frontend origin for CORS


4. **Database Setup**:
- Ensure MongoDB is running (local or cloud like MongoDB Atlas).
- The server will automatically connect and load groups on startup.

## Running the Application ▶️ 

- **Development Mode** (with auto-reload using nodemon):

npm install -g nodemon  # If not installed globally
nodemon server.js


- **Production Mode**:
npm start


The server will run on `http://localhost:5000` (or the specified PORT). It includes a default route `/` that returns `{ status: 'Backend is running' }`.

## API Endpoints 🌐

The backend exposes HTTP endpoints primarily for authentication. Additional functionality is handled via Socket.IO events.

- **POST /register**: Register a new user.
- Body: `{ username: string, password: string }`

- **POST /login**: Login an existing user.
- Body: `{ username: string, password: string }`
- Returns: User details on success.

(Note: Auth routes are defined in `./routes/auth.js`. Extend as needed for more endpoints.)

## Socket.IO Events 📤📥

Clients connect via Socket.IO and emit/receive the following events:

- **connection**: User connects; emits online users and groups.
- **join (username)**: User joins with username; auto-joins group rooms.
- **createGroup ({ groupName, members })**: Creates a new group and notifies members.
- **sendMessage ({ recipient, message, isGroup })**: Sends a message to a user or group.
- **getMessageHistory ({ room, isGroup })**: Retrieves chat history for a room.
- **markAsSeen ({ room, isGroup })**: Marks messages as seen and updates participants.
- **deleteGroup (groupId)**: Deletes a group (creator only).
- **addMemberToGroup ({ groupId, newMember })**: Adds a member and notifies the group.
- **kickMemberFromGroup ({ groupId, memberToKick })**: Kicks a member and notifies the group.
- **disconnect**: Handles user disconnection and updates online users.

Emitted Events to Clients:
- **users**: List of online users.
- **groups**: User's groups.
- **message**: New message payload.
- **messageHistory**: Array of past messages.
- **messageSeen**: Updates for seen status.
- **groupDeleted**: Notifies of group deletion.
- **error**: Error messages for invalid actions.

## Database Models 📊

- **User**: Username, hashed password.
- **Group**: ID, name, members (array), creator.
- **Message**: Room ID, user, text, timestamp, isGroup, seenBy (array).

## Security Considerations 🛡️
 
- Passwords are hashed with bcrypt.
- Group actions (delete, kick) restricted to creators.
- Real-time updates are room-specific to prevent unauthorized access.
- CORS restricted to specified frontend URL.

## Troubleshooting 🤝

- **MongoDB Connection Issues**: Verify MONGO_URI in .env.
- **Socket Connection Errors**: Ensure frontend URL matches CORS origin.
- **Group Not Loading**: Check console for DB errors; reload groups manually if needed.
- **Real-Time Not Working**: Verify Socket.IO client version matches server.

## Contributing 🤝

Contributions are welcome! Fork the repo, create a branch, and submit a pull request.

## License 📜

This project is licensed under the MIT License.
