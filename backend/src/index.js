import sequelize from "./db.js";
import User from "./models/User.js";
import Post from "./models/Post.js";
import PostLike from "./models/PostLike.js";
import Comment from "./models/Comment.js";
import CommentLike from "./models/CommentLike.js";
import Friendship from "./models/Friendship.js";
import Notification from "./models/Notification.js";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";
import BlacklistedToken from "./models/BlacklistedToken.js";
import { initializeAdmin } from "./utils/adminInit.js";

// Friendship associations only (Post associations are already in Post.js)
User.belongsToMany(User, {
  through: Friendship,
  as: 'SentFriendRequests',
  foreignKey: 'senderId',
  otherKey: 'receiverId'
});

User.belongsToMany(User, {
  through: Friendship,
  as: 'ReceivedFriendRequests', 
  foreignKey: 'receiverId',
  otherKey: 'senderId'
});

Friendship.belongsTo(User, { as: 'Sender', foreignKey: 'senderId' });
Friendship.belongsTo(User, { as: 'Receiver', foreignKey: 'receiverId' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { as: 'User', foreignKey: 'userId' });
Notification.belongsTo(User, { as: 'FromUser', foreignKey: 'fromUserId' });

// Chat and Message associations
Chat.hasMany(Message, { foreignKey: 'chatId' });
Message.belongsTo(Chat, { foreignKey: 'chatId' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
User.hasMany(Message, { foreignKey: 'senderId' });

// Add association for lastMessage
Chat.belongsTo(Message, { as: 'lastMessage', foreignKey: 'lastMessageId' });

// Comment associations
Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'postId' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(Comment, { foreignKey: 'userId' });

// Self-referencing association for comment replies
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parent' });

// CommentLike associations
Comment.hasMany(CommentLike, { foreignKey: 'commentId', as: 'likes' });
CommentLike.belongsTo(Comment, { foreignKey: 'commentId' });
CommentLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(CommentLike, { foreignKey: 'userId' });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import commentsRoutes from "./routes/comments.js";
import usersRoutes from "./routes/users.js";
import friendsRoutes from "./routes/friends.js";
import notificationsRoutes from "./routes/notifications.js";
import chatsRoutes from "./routes/chats.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();
const app = express();
const server = createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:8080"],
    methods: ["GET", "POST"],
    credentials: true // Allow credentials (cookies) to be sent
  },
  transports: ['polling', 'websocket'], // Try polling first
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 45000, // 45 seconds
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true, // Allow Engine.IO v3 clients
  cookie: false // Disable socket.io cookies since we use our own auth
});

// Store online users
const onlineUsers = new Map();

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  console.log('🔌 Socket connection attempt...');
  
  // Get cookies from the socket handshake
  const cookies = socket.handshake.headers.cookie;
  console.log('🍪 Cookies received:', cookies);
  
  if (!cookies) {
    console.log('❌ No cookies found');
    return next(new Error('No cookies provided'));
  }
  
  // Parse cookies to get the token
  const cookieArray = cookies.split(';');
  let token = null;
  
  for (let cookie of cookieArray) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'authToken') {
      token = value;
      break;
    }
  }
  
  if (!token) {
    console.log('❌ No authToken found in cookies');
    return next(new Error('No authentication token'));
  }
  
  console.log('🔑 Token found, verifying...');
  
  try {
    // Check if token is blacklisted
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const blacklistedToken = await BlacklistedToken.findOne({
      where: { tokenHash }
    });
    
    if (blacklistedToken) {
      console.log('🚫 Socket: Token is blacklisted!');
      return next(new Error('Token has been invalidated'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id; // Support both for backward compatibility
    socket.userId = userId;
    console.log('✅ Socket authenticated for user:', userId);
    next();
  } catch (err) {
    console.log('❌ Token verification failed:', err.message);
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected with socket ID: ${socket.id}`);
  
  // Store user as online
  onlineUsers.set(socket.userId, socket.id);
  
  // Join user to their personal room for notifications
  socket.join(`user_${socket.userId}`);
  
  // Send confirmation of successful connection
  socket.emit('connection_confirmed', {
    userId: socket.userId,
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });
  
  // Broadcast user online status to their friends
  socket.broadcast.emit('user_online', {
    userId: socket.userId,
    timestamp: new Date().toISOString()
  });

  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
  
  // Handle chat message sending
  socket.on('send_message', async (data) => {
    try {
      console.log('💬 Received send_message:', data);
      const { chatId, content } = data;
      
      // First, get the chat to verify user can send messages
      const chat = await Chat.findOne({
        where: { id: chatId },
        raw: true // Get plain object to avoid association issues
      });
      
      if (!chat) {
        console.log('❌ Chat not found');
        socket.emit('message_error', { error: 'Chat not found' });
        return;
      }
      
      // Parse participants from JSON field
      const participants = typeof chat.participants === 'string' 
        ? JSON.parse(chat.participants) 
        : chat.participants;
      
      // Verify user is a participant
      if (!participants.includes(socket.userId)) {
        console.log('❌ User not authorized for this chat');
        socket.emit('message_error', { error: 'Not authorized' });
        return;
      }
      
      // Create new message in database
      const message = await Message.create({
        chatId,
        senderId: socket.userId,
        content
      });
      
      // Get sender info separately
      const sender = await User.findByPk(socket.userId, {
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      });
      
      // Create message object with sender info
      const messageWithSender = {
        id: message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        sender: sender
      };
      
      console.log('📤 Sending message to participants:', participants);
      
      // Send message to all participants except sender
      participants.forEach(participantId => {
        if (participantId !== socket.userId) {
          const socketId = onlineUsers.get(participantId);
          if (socketId) {
            console.log(`📨 Sending to user ${participantId} (socket: ${socketId})`);
            io.to(socketId).emit('new_message', {
              chatId,
              message: messageWithSender
            });
          }
        }
      });
      
      // Update chat's last message info
      await Chat.update(
        {
          lastMessageId: message.id,
          lastMessageAt: new Date()
        },
        {
          where: { id: chatId }
        }
      );
      
      // Send confirmation back to sender
      socket.emit('message_sent', messageWithSender);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });
  
  // Handle joining a chat room
  socket.on('join_chat', (chatId) => {
    console.log(`💬 User ${socket.userId} joining chat ${chatId}`);
    socket.join(`chat_${chatId}`);
  });
  
  // Handle leaving a chat room
  socket.on('leave_chat', (chatId) => {
    console.log(`💬 User ${socket.userId} leaving chat ${chatId}`);
    socket.leave(`chat_${chatId}`);
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    console.log('⌨️ Typing indicator:', data);
    const { chatId, isTyping } = data;
    
    // Send typing indicator to other users in the chat
    socket.to(`chat_${chatId}`).emit('user_typing', {
      userId: socket.userId,
      chatId,
      isTyping
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.userId} disconnected. Reason: ${reason}`);
    
    // Remove from online users
    onlineUsers.delete(socket.userId);
    
    // Broadcast user offline status to their friends
    socket.broadcast.emit('user_offline', {
      userId: socket.userId,
      reason: reason,
      timestamp: new Date().toISOString()
    });
    
    // Clean up any pending operations for this user
    socket.removeAllListeners();
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
  });
});

// Make io available globally for other routes
global.io = io;
app.set('io', io);


// handle CORS and JSON body
const FRONTEND = process.env.FRONTEND_ORIGIN || ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:8080"];

app.use(
  cors({
    origin: FRONTEND,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);


app.use(express.json());
app.use(cookieParser()); // Add cookie parser middleware
app.use("/uploads", express.static("uploads")); // serve images
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/posts", commentsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/admin", adminRoutes);


// get user by id
app.get("/api/users/:id", async function (req, res) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["id", "username", "email", "avatar"]
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Add avatar URL
    const userData = user.toJSON();
    userData.avatarUrl = user.avatar ? "/uploads/" + user.avatar : null;
    return res.json(userData);
  } catch (err) {
    return res.status(500).json({ message: "Fetch error" });
  }
});

app.get("/user-avatar.png", (req, res) => {
  res.sendFile(process.cwd() + "/uploads/user-avatar.png");
});


const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.sync(); // Back to normal sync without force
    console.log("Database synchronized");
    
    // Manual migration: Add banReason column if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE Users ADD COLUMN banReason TEXT;
      `);
      console.log("✅ Added banReason column to Users table");
    } catch (error) {
      if (error.message.includes('duplicate column name') || error.message.includes('already exists')) {
        console.log("ℹ️ banReason column already exists");
      } else {
        console.log("ℹ️ banReason column migration skipped:", error.message);
      }
    }
    
    // Manual migrations for new settings columns
    const settingsColumns = [
      { name: 'bio', type: 'TEXT' },
      { name: 'location', type: 'VARCHAR(255)' },
      { name: 'theme', type: 'VARCHAR(255) DEFAULT "light"' },
      { name: 'notifications', type: 'VARCHAR(255) DEFAULT "all"' },
      { name: 'privacy', type: 'VARCHAR(255) DEFAULT "public"' },
      { name: 'emailNotifications', type: 'BOOLEAN DEFAULT 1' },
      { name: 'profileVisibility', type: 'VARCHAR(255) DEFAULT "public"' },
      { name: 'showOnlineStatus', type: 'BOOLEAN DEFAULT 1' },
      { name: 'allowDirectMessages', type: 'BOOLEAN DEFAULT 1' },
      { name: 'showActivityStatus', type: 'BOOLEAN DEFAULT 1' }
    ];
    
    for (const column of settingsColumns) {
      try {
        await sequelize.query(`
          ALTER TABLE Users ADD COLUMN ${column.name} ${column.type};
        `);
        console.log(`✅ Added ${column.name} column to Users table`);
      } catch (error) {
        if (error.message.includes('duplicate column name') || error.message.includes('already exists')) {
          console.log(`ℹ️ ${column.name} column already exists`);
        } else {
          console.log(`ℹ️ ${column.name} column migration skipped:`, error.message);
        }
      }
    }
    
    // Initialize admin user from environment variables
    await initializeAdmin();
    
    server.listen(PORT, function () {
      console.log("Server started on port", PORT);
      console.log("WebSocket server ready");
      
      // Clean up expired blacklisted tokens every hour
      setInterval(async () => {
        try {
          const { Op } = await import('sequelize');
          await BlacklistedToken.destroy({
            where: {
              expiresAt: {
                [Op.lt]: new Date()
              }
            }
          });
          console.log('🧹 Cleaned up expired blacklisted tokens');
        } catch (error) {
          console.error('Error cleaning up blacklisted tokens:', error);
        }
      }, 60 * 60 * 1000); // 1 hour
      
    });
  } catch (err) {
    console.error("DB or server start error:", err);
  }
}

start();
