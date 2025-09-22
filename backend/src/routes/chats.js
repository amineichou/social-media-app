import express from "express";
import protect from "../middleware/auth.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { validateField, sanitizeInput } from "../utils/validation.js";
import { Op, fn, col } from "sequelize";

const router = express.Router();

// Get all chats for current user
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all chats and filter in memory for SQLite JSON compatibility
    const allChats = await Chat.findAll({
      include: [
        {
          model: Message,
          as: 'lastMessage',
          required: false,
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'avatar']
          }]
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    // Filter chats where user is a participant
    const chats = allChats.filter(chat => {
      const participants = typeof chat.participants === 'string' 
        ? JSON.parse(chat.participants) 
        : chat.participants;
      return participants.includes(userId);
    });

    // Get participant details for each chat
    const chatsWithParticipants = await Promise.all(
      chats.map(async (chat) => {
        // Parse participants if it's a string
        const participants = typeof chat.participants === 'string' 
          ? JSON.parse(chat.participants) 
          : chat.participants;
          
        const participantIds = participants.filter(id => id !== userId);
        const participantDetails = await User.findAll({
          where: { id: participantIds },
          attributes: ['id', 'firstName', 'lastName', 'avatar', 'username']
        });
        
        return {
          ...chat.toJSON(),
          participants, // Use the parsed participants
          participantDetails
        };
      })
    );

    res.json(chatsWithParticipants);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Error fetching chats" });
  }
});

// Get or create chat between users
router.post("/", protect, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    // Check if chat already exists between these two users
    const allChats = await Chat.findAll({
      where: { isGroupChat: false }
    });

    const existingChat = allChats.find(chat => {
      const participants = typeof chat.participants === 'string' 
        ? JSON.parse(chat.participants) 
        : chat.participants;
      return participants.includes(userId) && participants.includes(parseInt(recipientId));
    });

    if (existingChat) {
      // Get participant details for existing chat
      const participants = typeof existingChat.participants === 'string' 
        ? JSON.parse(existingChat.participants) 
        : existingChat.participants;
        
      const participantIds = participants.filter(id => id !== userId);
      const participantDetails = await User.findAll({
        where: { id: participantIds },
        attributes: ['id', 'firstName', 'lastName', 'avatar', 'username']
      });
      
      return res.json({
        ...existingChat.toJSON(),
        participants,
        participantDetails
      });
    }

    // Create new chat
    const newChat = await Chat.create({
      participants: [userId, parseInt(recipientId)],
      isGroupChat: false
    });

    // Get participant details for new chat
    const participantDetails = await User.findAll({
      where: { id: parseInt(recipientId) },
      attributes: ['id', 'firstName', 'lastName', 'avatar', 'username']
    });

    res.status(201).json({
      ...newChat.toJSON(),
      participantDetails
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ message: "Error creating chat" });
  }
});

// Get messages for a specific chat with pagination
router.get("/:chatId/messages", protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    // Verify user is part of this chat
    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is a participant
    const participants = typeof chat.participants === 'string' 
      ? JSON.parse(chat.participants) 
      : chat.participants;
    
    if (!participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const offset = (page - 1) * limit;
    
    const messages = await Message.findAll({
      where: { chatId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'firstName', 'lastName', 'avatar']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalMessages = await Message.count({ where: { chatId } });
    const hasMore = offset + messages.length < totalMessages;

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      hasMore,
      total: totalMessages
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// Send message
router.post("/:chatId/messages", protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

        // Validate and sanitize content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    const sanitizedContent = sanitizeInput(content);

    // Verify user is part of this chat
    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is a participant
    const participants = typeof chat.participants === 'string' 
      ? JSON.parse(chat.participants) 
      : chat.participants;
    
    if (!participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Create message
    const message = await Message.create({
      chatId,
      senderId: userId,
      content: sanitizedContent
    });

    // Update chat's last message info
    await chat.update({
      lastMessageId: message.id,
      lastMessageAt: new Date()
    });

    // Get message with sender details
    const messageWithSender = await Message.findByPk(message.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'firstName', 'lastName', 'avatar']
      }]
    });

    // Emit real-time message to chat participants
    const io = req.app.get('io');
    if (io) {
      participants.forEach(participantId => {
        if (participantId !== userId) {
          io.to(`user_${participantId}`).emit('new_message', {
            chatId: parseInt(chatId),
            message: messageWithSender
          });
        }
      });
    }

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
  }
});

// Mark messages as read
router.patch("/:chatId/read", protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this chat
    const chat = await Chat.findOne({
      where: {
        id: chatId,
        participants: {
          [Op.like]: `%${userId}%`
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Update all unread messages from other users as read
    await Message.update(
      { isRead: true },
      {
        where: {
          chatId,
          senderId: { [Op.ne]: userId },
          isRead: false
        }
      }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Error marking messages as read" });
  }
});

// Delete a chat
router.delete("/:chatId", protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Find the chat
    const chat = await Chat.findByPk(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is a participant
    const participants = typeof chat.participants === 'string' 
      ? JSON.parse(chat.participants) 
      : chat.participants;
    
    if (!participants.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Delete all messages in this chat
    await Message.destroy({
      where: { chatId }
    });

    // Delete the chat
    await chat.destroy();

    // Emit to all participants that the chat was deleted
    const io = req.app.get('io');
    if (io) {
      participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('chatDeleted', {
          chatId: parseInt(chatId)
        });
      });
    }

    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ message: "Error deleting chat" });
  }
});

export default router;
