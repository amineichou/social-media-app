import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import User from "../models/User.js";
import Post from "../models/Post.js";
import auth from "../middleware/auth.js";
import { validateRequestBody } from "../utils/validation.js";

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to calculate age
function calculateAge(birthday) {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Get current user's profile
router.get("/me", auth, async function (req, res) {
  try {
    const userId = req.userId;
    
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'firstName', 'lastName', 'username', 'email', 
        'avatar', 'birthday', 'gender', 'bio', 'location',
        'theme', 'notifications', 'privacy', 'emailNotifications',
        'profileVisibility', 'showOnlineStatus', 'allowDirectMessages', 
        'showActivityStatus', 'isAdmin', 'isBanned', 'lastActive', 'createdAt'
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update last active timestamp
    await user.update({ lastActive: new Date() });

    return res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      birthday: user.birthday,
      gender: user.gender,
      bio: user.bio,
      location: user.location,
      theme: user.theme,
      notifications: user.notifications,
      privacy: user.privacy,
      emailNotifications: user.emailNotifications,
      profileVisibility: user.profileVisibility,
      showOnlineStatus: user.showOnlineStatus,
      allowDirectMessages: user.allowDirectMessages,
      showActivityStatus: user.showActivityStatus,
      isAdmin: user.isAdmin, // This is the important field for admin detection
      isBanned: user.isBanned,
      lastActive: user.lastActive,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({ message: "Failed to fetch user data" });
  }
});

// Check ban status endpoint - minimal auth, just to check if user is banned
router.get("/ban-status", async function (req, res) {
  try {
    // Try to get token from Authorization header first, then from cookies
    let token = req.headers.authorization;
    
    if (!token && req.cookies.authToken) {
      token = `Bearer ${req.cookies.authToken}`;
    }
    
    if (!token) {
      return res.json({ isBanned: false, message: "No authentication" });
    }
    
    const actualToken = token.replace("Bearer ", "");
    const payload = jwt.verify(actualToken, process.env.JWT_SECRET);
    
    // Get user to check ban status
    const userId = payload.userId || payload.id;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'isBanned', 'banReason', 'username', 'isAdmin']
    });
    
    if (!user) {
      return res.json({ isBanned: false, message: "User not found" });
    }
    
    return res.json({
      isBanned: user.isBanned || false,
      banReason: user.banReason || null,
      username: user.username,
      isAdmin: user.isAdmin || false
    });
  } catch (error) {
    console.error("Error checking ban status:", error);
    return res.json({ isBanned: false, message: "Invalid token" });
  }
});

// Search users endpoint
router.get("/search", auth, async function (req, res) {
  try {
    const { q, limit = 5, random } = req.query;
    const userId = req.userId;
    const searchLimit = Math.min(parseInt(limit) || 5, 10); // Max 10 results

    // If random=1 and no query, return random users
    if (random === '1' && (!q || q.trim().length === 0)) {
      // Get all eligible users (excluding current and banned)
      const allUsers = await User.findAll({
        where: {
          id: { [Op.ne]: userId },
          isBanned: { [Op.ne]: true }
        },
        attributes: ['id', 'firstName', 'lastName', 'username', 'avatar']
      });
      // Shuffle and pick up to searchLimit
      const shuffled = allUsers.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, searchLimit);
      return res.json(selected);
    }

    // Validate query parameter
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = q.trim().toLowerCase();

    // Search users by first name, last name, or username
    const users = await User.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: userId } },
          { isBanned: { [Op.ne]: true } },
          {
            [Op.or]: [
              User.sequelize.where(
                User.sequelize.fn('LOWER', User.sequelize.col('firstName')),
                'LIKE',
                `%${searchTerm}%`
              ),
              User.sequelize.where(
                User.sequelize.fn('LOWER', User.sequelize.col('lastName')),
                'LIKE',
                `%${searchTerm}%`
              ),
              User.sequelize.where(
                User.sequelize.fn('LOWER', User.sequelize.col('username')),
                'LIKE',
                `%${searchTerm}%`
              )
            ]
          }
        ]
      },
      attributes: ['id', 'firstName', 'lastName', 'username', 'avatar'],
      limit: searchLimit,
      order: [
        ['firstName', 'ASC'],
        ['lastName', 'ASC'],
        ['username', 'ASC']
      ]
    });

    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatar: user.avatar
    }));

    return res.json(formattedUsers);
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({ message: "Failed to search users" });
  }
});

// Update current user's profile
router.put("/me", auth, (req, res, next) => {
  // Use multer only if there are files
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.single("avatar")(req, res, next);
  } else {
    next();
  }
}, validateRequestBody(['firstName', 'lastName', 'username', 'email', 'password']), async function (req, res) {
  try {
    const userId = req.userId;
    const { firstName, lastName, username, email, currentPassword, password, birthday, gender } = req.body;
    
    // Get current user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare update data
    const updateData = {};
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (birthday) {
      // Validate age (must be 18+)
      const age = calculateAge(birthday);
      if (age < 18) {
        return res.status(400).json({ 
          message: "You must be at least 18 years old" 
        });
      }
      updateData.birthday = birthday;
    }
    if (gender && ['male', 'female'].includes(gender)) {
      updateData.gender = gender;
    }
    
    // Check if username is taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ 
        where: { username },
        attributes: ['id']
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }
      updateData.username = username;
    }
    
    // Check if email is taken by another user
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ 
        where: { email },
        attributes: ['id']
      });
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ message: "Email already registered" });
      }
    }
    
    // Handle password update with current password verification
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to change password" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }
    
    // Handle avatar upload and delete old one
    if (req.file) {
      // Delete old avatar if it's not the default one
      if (user.avatar && user.avatar !== '/user-avatar.png' && !user.avatar.startsWith('http')) {
        const oldAvatarPath = path.join(process.cwd(), user.avatar.replace(/^\//, ''));
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (error) {
            console.error('Error deleting old avatar:', error);
          }
        }
      }
      updateData.avatar = `/uploads/${req.file.filename}`;
    }
    
    // Update user
    await user.update(updateData);
    
    // Fetch updated user data
    const updatedUser = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'avatar', 'birthday', 'gender', 'createdAt']
    });
    
    res.json({ 
      message: "Profile updated successfully", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get current user's profile (must be before /:id route)
router.get("/me", auth, async function (req, res) {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'avatar', 'birthday', 'gender', 'createdAt'],
      include: [
        {
          model: Post,
          foreignKey: 'authorId',
          attributes: ['id', 'title', 'content', 'imageUrl', 'createdAt'],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Error fetching current user:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get user profile by ID
router.get("/:id", auth, async function (req, res) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'avatar', 'birthday', 'gender', 'createdAt', 'isBanned', 'banReason']
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get user posts with pagination
router.get("/:id/posts", auth, async function (req, res) {
  try {
    const { page = 1, limit = 5 } = req.query;
    const userId = req.params.id === 'me' ? req.userId : req.params.id;
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 10); // Max 10 posts per page
    const offset = (pageNum - 1) * limitNum;

    // Get user to include author info with posts
    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'username', 'avatar']
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get posts with pagination
    const { count, rows: posts } = await Post.findAndCountAll({
      where: { authorId: userId },
      attributes: ['id', 'title', 'content', 'imageUrl', 'createdAt', 'authorId'],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset
    });

    // Add author info to each post
    const postsWithAuthor = posts.map(post => ({
      ...post.toJSON(),
      author: user
    }));

    const totalPages = Math.ceil(count / limitNum);
    const hasMore = pageNum < totalPages;

    return res.json({
      posts: postsWithAuthor,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalPosts: count,
        limit: limitNum,
        hasMore
      },
      total: count,
      hasMore
    });
  } catch (err) {
    console.error("Error fetching user posts:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update user settings
router.put("/settings", auth, async function (req, res) {
  try {
    const userId = req.userId;
    const {
      firstName,
      lastName,
      username,
      email,
      bio,
      location,
      theme,
      notifications,
      privacy,
      emailNotifications,
      profileVisibility,
      showOnlineStatus,
      allowDirectMessages,
      showActivityStatus
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if username or email already exists (excluding current user)
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({
        where: { username, id: { [Op.ne]: userId } }
      });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: { email, id: { [Op.ne]: userId } }
      });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Update user information
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (theme !== undefined) updateData.theme = theme;
    if (notifications !== undefined) updateData.notifications = notifications;
    if (privacy !== undefined) updateData.privacy = privacy;
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (profileVisibility !== undefined) updateData.profileVisibility = profileVisibility;
    if (showOnlineStatus !== undefined) updateData.showOnlineStatus = showOnlineStatus;
    if (allowDirectMessages !== undefined) updateData.allowDirectMessages = allowDirectMessages;
    if (showActivityStatus !== undefined) updateData.showActivityStatus = showActivityStatus;

    await user.update(updateData);

    return res.json({ 
      message: "Settings updated successfully",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        bio: user.bio,
        location: user.location,
        theme: user.theme,
        notifications: user.notifications,
        privacy: user.privacy,
        emailNotifications: user.emailNotifications,
        profileVisibility: user.profileVisibility,
        showOnlineStatus: user.showOnlineStatus,
        allowDirectMessages: user.allowDirectMessages,
        showActivityStatus: user.showActivityStatus
      }
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return res.status(500).json({ message: "Failed to update settings" });
  }
});

// Delete user account
router.delete("/delete-account", auth, async function (req, res) {
  try {
    const userId = req.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required for account deletion" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Delete user's avatar file if exists
    if (user.avatar && !user.avatar.startsWith('http')) {
      const avatarPath = path.join(process.cwd(), 'uploads', path.basename(user.avatar));
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Delete user account (this should cascade delete related data)
    await user.destroy();

    return res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({ message: "Failed to delete account" });
  }
});

export default router;
