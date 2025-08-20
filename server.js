require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Group = require('./models/Group');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://chat-app-frontend-olive-psi.vercel.app',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Kết nối MongoDB
mongoose.connect( process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Load groups từ DB khi server start
let groups = [];
async function loadGroups() {
    try {
        groups = await Group.find({}).lean(); // Load all groups, lean() để lấy plain JS object
        console.log(`Loaded ${groups.length} groups from DB`);
    } catch (err) {
        console.error('Error loading groups:', err);
    }
}
loadGroups();
// Export groups để socketHandler dùng
module.exports = { io, groups };

// Import và sử dụng routes API
const authRoutes = require('./routes/auth');
app.use(authRoutes);

// Import và sử dụng logic Socket.IO
const socketHandler = require('./socket/handler');
socketHandler(io, groups);



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});