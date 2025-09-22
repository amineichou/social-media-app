import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import PostLike from "../models/PostLike.js";
import CommentLike from "../models/CommentLike.js";
import Notification from "../models/Notification.js";
import adminAuth from "../middleware/adminAuth.js";
import { Op } from "sequelize";
import sequelize from "../db.js";

const router = express.Router();

// Dashboard Analytics
router.get("/analytics", adminAuth, async function (req, res) {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    console.log('📊 Fetching analytics with timeframe:', timeframe, 'startDate:', startDate);

    // User statistics
    console.log('📊 Fetching user statistics...');
    const totalUsers = await User.count();
    const newUsers = await User.count({
      where: { createdAt: { [Op.gte]: startDate } }
    });
    const bannedUsers = await User.count({
      where: { isBanned: true }
    });

    // Post statistics
    console.log('📊 Fetching post statistics...');
    const totalPosts = await Post.count();
    const newPosts = await Post.count({
      where: { createdAt: { [Op.gte]: startDate } }
    });
    const totalLikes = await PostLike.count();

    // Comment statistics
    console.log('📊 Fetching comment statistics...');
    const totalComments = await Comment.count();
    const newComments = await Comment.count({
      where: { createdAt: { [Op.gte]: startDate } }
    });
    const totalCommentLikes = await CommentLike.count();

    // User growth over time (simplified)
    console.log('📊 Fetching user growth data...');
    const userGrowthData = await User.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Post activity over time (simplified)
    console.log('📊 Fetching post activity data...');
    const postActivityData = await Post.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Most active users (simplified to avoid complex subqueries)
    console.log('📊 Fetching most active users...');
    const mostActiveUsers = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'username', 'avatar'],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    // Add post and comment counts manually
    for (let user of mostActiveUsers) {
      const postCount = await Post.count({ where: { authorId: user.id } });
      const commentCount = await Comment.count({ where: { userId: user.id } });
      user.dataValues.postCount = postCount;
      user.dataValues.commentCount = commentCount;
    }

    console.log('📊 Analytics data fetched successfully');

    return res.json({
      overview: {
        totalUsers,
        newUsers,
        bannedUsers,
        totalPosts,
        newPosts,
        totalLikes,
        totalComments,
        newComments,
        totalCommentLikes
      },
      charts: {
        userGrowth: userGrowthData,
        postActivity: postActivityData
      },
      leaderboards: {
        mostActiveUsers
      }
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ message: "Failed to fetch analytics", error: error.message });
  }
});

// User Management
router.get("/users", adminAuth, async function (req, res) {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      status = 'all',
      sortBy = 'createdAt',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * parseInt(limit);
    
    let whereClause = {};
    
    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Status filter
    if (status === 'banned') {
      whereClause.isBanned = true;
    } else if (status === 'active') {
      whereClause.isBanned = false;
    } else if (status === 'admin') {
      whereClause.isAdmin = true;
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'firstName', 'lastName', 'username', 'email', 
        'avatar', 'isAdmin', 'isBanned', 'lastActive', 'createdAt',
        [sequelize.literal('(SELECT COUNT(*) FROM Posts WHERE authorId = User.id)'), 'postCount'],
        [sequelize.literal('(SELECT COUNT(*) FROM Comments WHERE userId = User.id)'), 'commentCount']
      ],
      order: [[sortBy, order]],
      limit: parseInt(limit),
      offset: offset
    });

    return res.json({
      users: users.rows,
      pagination: {
        total: users.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(users.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Ban/Unban user
router.patch("/users/:userId/ban", adminAuth, async function (req, res) {
  try {
    const { userId } = req.params;
    const { banned, reason } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isAdmin) {
      return res.status(403).json({ message: "Cannot ban admin users" });
    }

    // Update user ban status and reason
    await user.update({ 
      isBanned: banned,
      banReason: banned ? reason : null
    });

    // Create notification in database
    const notificationMessage = banned 
      ? `Your account has been banned. ${reason ? 'Reason: ' + reason : 'Please contact support for more information.'}`
      : 'Your account has been unbanned. Welcome back to our community!';

    await Notification.create({
      userId: userId,
      message: notificationMessage,
      type: banned ? 'ban' : 'unban',
      fromUserId: req.user.id // Admin who performed the action
    });

    // Log the action
    console.log(`Admin ${req.user.username} ${banned ? 'banned' : 'unbanned'} user ${user.username}. Reason: ${reason || 'No reason provided'}`);

    // Send real-time notification to user
    if (global.io) {
      global.io.to(`user_${userId}`).emit('admin_notification', {
        type: banned ? 'ban' : 'unban',
        message: notificationMessage,
        timestamp: new Date()
      });
    }

    return res.json({ 
      message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
      user: {
        id: user.id,
        username: user.username,
        isBanned: user.isBanned,
        banReason: user.banReason
      }
    });
  } catch (error) {
    console.error("Admin ban user error:", error);
    return res.status(500).json({ message: "Failed to update user status" });
  }
});

// Delete user
router.delete("/users/:userId", adminAuth, async function (req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Security check: Cannot delete admin users
    if (user.isAdmin) {
      return res.status(403).json({ message: "Cannot delete admin users. Demote them first." });
    }

    // Security check: Cannot delete yourself
    if (user.id === req.user.id) {
      return res.status(403).json({ message: "Cannot delete your own account" });
    }

    // Enhanced logging with security information
    const requestIP = req.ip || req.connection.remoteAddress || 'unknown';
    console.log(`🔐 ADMIN ACTION: ${req.user.username} (ID: ${req.user.id}) deleted user ${user.username} (ID: ${user.id})`);
    console.log(`   IP: ${requestIP}, Time: ${new Date().toISOString()}`);

    await user.destroy();

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
});

// Promote/Demote admin
router.patch("/users/:userId/admin", adminAuth, async function (req, res) {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Security check: Prevent demoting yourself if you're the last admin
    if (!isAdmin && user.id === req.user.id) {
      const adminCount = await User.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return res.status(403).json({ 
          message: "Cannot demote yourself - you are the last admin. Create another admin first." 
        });
      }
    }

    // Security check: Log the admin action with IP for audit trail
    const requestIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    await user.update({ isAdmin });

    // Enhanced logging with security information
    console.log(`🔐 ADMIN ACTION: ${req.user.username} (ID: ${req.user.id}) ${isAdmin ? 'promoted' : 'demoted'} user ${user.username} (ID: ${user.id}) ${isAdmin ? 'to' : 'from'} admin status`);
    console.log(`   IP: ${requestIP}, Time: ${new Date().toISOString()}`);

    return res.json({ 
      message: `User ${isAdmin ? 'promoted to admin' : 'demoted from admin'} successfully`,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error("Admin promote user error:", error);
    return res.status(500).json({ message: "Failed to update user admin status" });
  }
});

// Broadcast notification
router.post("/notifications/broadcast", adminAuth, async function (req, res) {
  try {
    const { message, type = 'info', targetUsers = 'all', userIds = [] } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const notification = {
      type: 'admin_broadcast',
      subType: type,
      message: message,
      from: `Admin: ${req.user.firstName} ${req.user.lastName}`,
      timestamp: new Date()
    };

    let targetCount = 0;

    if (global.io) {
      if (targetUsers === 'all') {
        // Send to all connected users
        global.io.emit('admin_notification', notification);
        targetCount = global.io.engine.clientsCount;
      } else if (targetUsers === 'specific' && userIds.length > 0) {
        // Send to specific users
        for (const userId of userIds) {
          global.io.to(`user_${userId}`).emit('admin_notification', notification);
          targetCount++;
        }
      } else if (targetUsers === 'admins') {
        // Send to admin users only
        const adminUsers = await User.findAll({
          where: { isAdmin: true },
          attributes: ['id']
        });
        
        for (const admin of adminUsers) {
          global.io.to(`user_${admin.id}`).emit('admin_notification', notification);
          targetCount++;
        }
      }
    }

    // Log the broadcast
    console.log(`Admin ${req.user.username} sent broadcast notification to ${targetUsers}: "${message}"`);

    return res.json({ 
      message: "Notification sent successfully",
      targetCount: targetCount,
      notification: notification
    });
  } catch (error) {
    console.error("Admin broadcast error:", error);
    return res.status(500).json({ message: "Failed to send notification" });
  }
});

// System logs
router.get("/logs", adminAuth, async function (req, res) {
  try {
    const { page = 1, limit = 100, type = 'all' } = req.query;

    // This is a simplified log system - in production you'd use proper logging
    const logs = [
      {
        id: 1,
        timestamp: new Date(),
        type: 'user_action',
        message: 'Sample log entry - implement proper logging system',
        details: { userId: 1, action: 'login' }
      }
    ];

    return res.json({
      logs: logs,
      pagination: {
        total: logs.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(logs.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Admin logs error:", error);
    return res.status(500).json({ message: "Failed to fetch logs" });
  }
});

export default router;
