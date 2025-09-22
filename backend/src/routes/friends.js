import express from "express";
import User from "../models/User.js";
import Friendship from "../models/Friendship.js";
import Notification from "../models/Notification.js";
import auth from "../middleware/auth.js";
import { Op } from "sequelize";

const router = express.Router();

// Send friend request
router.post("/request/:userId", auth, async (req, res) => {
  try {
    const senderId = req.userId;
    const receiverId = parseInt(req.params.userId);

    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ message: "Friend request already exists" });
    }

    const friendship = await Friendship.create({
      senderId,
      receiverId,
      status: 'pending'
    });

    // Get sender info for notification
    const sender = await User.findByPk(senderId, {
      attributes: ['firstName', 'lastName', 'username']
    });

    // Create notification for receiver
    const notification = await Notification.create({
      userId: receiverId,
      type: 'friend_request',
      message: `${sender.firstName} ${sender.lastName} sent you a friend request`,
      fromUserId: senderId,
      relatedId: friendship.id
    });

    // Emit real-time notification if user is online
    if (global.io) {
      global.io.to(`user_${receiverId}`).emit('new_notification', {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        fromUser: sender,
        createdAt: notification.createdAt,
        isRead: false
      });
    }

    res.status(201).json({ message: "Friend request sent", friendship });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept friend request
router.post("/accept/:userId", auth, async (req, res) => {
  try {
    const receiverId = req.userId;
    const senderId = parseInt(req.params.userId);

    const friendship = await Friendship.findOne({
      where: {
        senderId: senderId,
        receiverId: receiverId,
        status: 'pending'
      }
    });
    
    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    friendship.status = 'accepted';
    await friendship.save();

    // Get receiver info for notification
    const receiver = await User.findByPk(receiverId, {
      attributes: ['firstName', 'lastName', 'username']
    });

    // Create notification for sender
    const notification = await Notification.create({
      userId: senderId,
      type: 'friend_accepted',
      message: `${receiver.firstName} ${receiver.lastName} accepted your friend request`,
      fromUserId: receiverId,
      relatedId: friendship.id
    });

    // Emit real-time notification if user is online
    if (global.io) {
      global.io.to(`user_${senderId}`).emit('new_notification', {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        fromUser: receiver,
        createdAt: notification.createdAt,
        isRead: false
      });
      
      // Also emit friendship update to both users
      global.io.to(`user_${senderId}`).emit('friendship_updated', {
        type: 'accepted',
        userId: receiverId,
        friend: receiver
      });
      
      global.io.to(`user_${receiverId}`).emit('friendship_updated', {
        type: 'accepted',
        userId: senderId,
        friend: receiver
      });
    }

    res.json({ message: "Friend request accepted", friendship });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove friend or reject request
router.delete("/:userId", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const friendId = parseInt(req.params.userId);

    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      }
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    await friendship.destroy();
    res.json({ message: "Friendship removed" });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's friends
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.userId;

    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, status: 'accepted' },
          { receiverId: userId, status: 'accepted' }
        ]
      },
      include: [
        {
          model: User,
          as: 'Sender',
          attributes: ['id', 'firstName', 'lastName', 'username', 'avatar']
        },
        {
          model: User,
          as: 'Receiver', 
          attributes: ['id', 'firstName', 'lastName', 'username', 'avatar']
        }
      ]
    });

    // Extract friend data
    const friends = friendships.map(friendship => {
      return friendship.senderId === userId ? friendship.Receiver : friendship.Sender;
    });

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get friend requests (received)
router.get("/requests", auth, async (req, res) => {
  try {
    const userId = req.userId;

    const friendRequests = await Friendship.findAll({
      where: {
        receiverId: userId,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'Sender',
          attributes: ['id', 'firstName', 'lastName', 'username', 'avatar']
        }
      ]
    });

    res.json(friendRequests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get mutual friends with another user
router.get("/mutual/:userId", auth, async (req, res) => {
  try {
    const currentUserId = req.userId;
    const otherUserId = parseInt(req.params.userId);

    // Get current user's friends
    const currentUserFriends = await Friendship.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, status: 'accepted' },
          { receiverId: currentUserId, status: 'accepted' }
        ]
      }
    });

    // Get other user's friends
    const otherUserFriends = await Friendship.findAll({
      where: {
        [Op.or]: [
          { senderId: otherUserId, status: 'accepted' },
          { receiverId: otherUserId, status: 'accepted' }
        ]
      }
    });

    // Extract friend IDs for current user
    const currentUserFriendIds = currentUserFriends.map(friendship => 
      friendship.senderId === currentUserId ? friendship.receiverId : friendship.senderId
    );

    // Extract friend IDs for other user
    const otherUserFriendIds = otherUserFriends.map(friendship => 
      friendship.senderId === otherUserId ? friendship.receiverId : friendship.senderId
    );

    // Find mutual friend IDs
    const mutualFriendIds = currentUserFriendIds.filter(id => otherUserFriendIds.includes(id));

    // Get mutual friends details
    const mutualFriends = await User.findAll({
      where: {
        id: {
          [Op.in]: mutualFriendIds
        }
      },
      attributes: ['id', 'firstName', 'lastName', 'username', 'avatar']
    });

    res.json(mutualFriends);
  } catch (error) {
    console.error("Error fetching mutual friends:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get friend status with another user
router.get("/status/:userId", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const otherUserId = parseInt(req.params.userId);

    if (userId === otherUserId) {
      return res.json({ status: 'self' });
    }

    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      }
    });

    if (!friendship) {
      return res.json({ status: 'none' });
    }

    if (friendship.status === 'accepted') {
      return res.json({ status: 'friends', friendship });
    }

    if (friendship.senderId === userId) {
      return res.json({ status: 'sent', friendship });
    } else {
      return res.json({ status: 'received', friendship });
    }
  } catch (error) {
    console.error("Error checking friend status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
