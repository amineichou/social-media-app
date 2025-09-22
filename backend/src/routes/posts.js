import express from "express";
import multer from "multer";
import Post from "../models/Post.js";
import PostLike from "../models/PostLike.js";
import Comment from "../models/Comment.js";
import CommentLike from "../models/CommentLike.js";
import User from "../models/User.js";
import Friendship from "../models/Friendship.js";
import Notification from "../models/Notification.js";
import auth from "../middleware/auth.js";
import { Op } from "sequelize";
import { validateField, sanitizeInput } from "../utils/validation.js";

const router = express.Router();

// Configure multer for post image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

router.get("/", auth, async function (req, res) {
  try {
    const userId = req.userId;
    const { page = 1, limit = 5 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 20); // Max 20 posts per page
    const offset = (pageNum - 1) * limitNum;

    // Get user's friends
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, status: 'accepted' },
          { receiverId: userId, status: 'accepted' }
        ]
      }
    });

    // Extract friend IDs
    const friendIds = friendships.map(friendship => 
      friendship.senderId === userId ? friendship.receiverId : friendship.senderId
    );

    // Add user's own ID to see their own posts
    friendIds.push(userId);

    // Get all posts with detailed information for algorithm
    const allPosts = await Post.findAll({
      include: [
        { 
          model: User, 
          as: "author", 
          attributes: ["id", "firstName", "lastName", "username", "avatar"] 
        },
        {
          model: PostLike,
          as: "likes",
          attributes: ["likeType", "userId", "createdAt"]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: 200 // Get more posts for better algorithm selection
    });

    // Process posts with algorithmic scoring
    const processedPosts = await Promise.all(allPosts.map(async post => {
      const postData = post.toJSON();
      
      // Calculate engagement metrics
      const likesCount = postData.likes.filter(like => like.likeType === 'like').length;
      const dislikesCount = postData.likes.filter(like => like.likeType === 'dislike').length;
      const netLikes = likesCount - dislikesCount;
      
      // Count comments (only top-level comments)
      const commentsCount = await Comment.count({
        where: { postId: post.id, parentId: null }
      });
      
      // Check user's like status
      const userLike = postData.likes.find(like => like.userId === userId);
      const userLikeType = userLike ? userLike.likeType : null;
      
      // Calculate algorithmic score
      let score = 0;
      
      // 1. Friendship bonus (highest priority)
      const isFriend = friendIds.includes(postData.authorId);
      const isOwnPost = postData.authorId === userId;
      if (isOwnPost) {
        score += 1000; // Highest priority for own posts
      } else if (isFriend) {
        score += 500; // High priority for friends' posts
      }
      
      // 2. Recency factor (time decay)
      const postAge = (Date.now() - new Date(postData.createdAt)) / (1000 * 60 * 60); // Age in hours
      const recencyScore = Math.max(0, 100 - (postAge * 2)); // Decay over time
      score += recencyScore;
      
      // 3. Engagement factor
      const engagementScore = (likesCount * 10) + (commentsCount * 15) - (dislikesCount * 5);
      score += Math.min(engagementScore, 200); // Cap engagement bonus
      
      // 4. Recent engagement bonus (likes/comments in last 24 hours)
      const recentLikes = postData.likes.filter(like => {
        const likeAge = (Date.now() - new Date(like.createdAt)) / (1000 * 60 * 60);
        return likeAge <= 24;
      }).length;
      score += recentLikes * 5;
      
      // 5. Content quality indicators
      if (postData.imageUrl) {
        score += 20; // Images get slight boost
      }
      if (postData.content && postData.content.length > 50) {
        score += 10; // Longer content gets slight boost
      }
      
      // 6. Avoid showing very old posts unless they're from friends
      if (postAge > 168 && !isFriend) { // Older than 1 week
        score *= 0.1; // Heavily penalize old non-friend posts
      }
      
      return {
        ...postData,
        likesCount,
        dislikesCount,
        userLikeType,
        commentsCount,
        algorithmScore: score,
        isFriend,
        isOwnPost,
        likes: undefined // Remove the detailed likes array from response
      };
    }));

    // Sort by algorithmic score (highest first)
    processedPosts.sort((a, b) => b.algorithmScore - a.algorithmScore);
    
    // Apply pagination to the sorted results
    const paginatedPosts = processedPosts.slice(offset, offset + limitNum);
    const totalPosts = processedPosts.length;
    const totalPages = Math.ceil(totalPosts / limitNum);
    const hasMore = pageNum < totalPages;
    
    // Remove algorithm metadata from final response
    const finalPosts = paginatedPosts.map(post => {
      const { algorithmScore, isFriend, isOwnPost, ...cleanPost } = post;
      return cleanPost;
    });

    return res.json({
      posts: finalPosts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalPosts,
        limit: limitNum,
        hasMore
      },
      hasMore
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
    return res.status(500).json({ message: "Fetch error" });
  }
});

router.get("/:id", auth, async function (req, res) {
  try {
    const userId = req.userId;
    const post = await Post.findByPk(req.params.id, {
      include: [
        { 
          model: User, 
          as: "author", 
          attributes: ["id", "firstName", "lastName", "username", "avatar"] 
        },
        {
          model: PostLike,
          as: "likes",
          attributes: ["likeType", "userId"]
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({ message: "Not found" });
    }

    const postData = post.toJSON();
    
    // Count likes and dislikes
    const likesCount = postData.likes.filter(like => like.likeType === 'like').length;
    const dislikesCount = postData.likes.filter(like => like.likeType === 'dislike').length;
    
    // Count comments (only top-level comments)
    const commentsCount = await Comment.count({
      where: { postId: post.id, parentId: null }
    });
    
    // Check user's like status
    const userLike = postData.likes.find(like => like.userId === userId);
    const userLikeType = userLike ? userLike.likeType : null;
    
    const processedPost = {
      ...postData,
      likesCount,
      dislikesCount,
      userLikeType,
      commentsCount,
      likes: undefined // Remove the detailed likes array from response
    };

    return res.json(processedPost);
  } catch (err) {
    return res.status(500).json({ message: "Fetch error" });
  }
});

router.post("/", auth, upload.single("image"), async function (req, res) {
  try {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("Content-Type:", req.headers['content-type']);
    
    const { title, content } = req.body;
    
    // Validate and sanitize content
    const contentValidation = validateField('postContent', content);
    if (!contentValidation.isValid) {
      return res.status(400).json({ 
        message: contentValidation.error
      });
    }
    
    // Sanitize title if provided
    const sanitizedTitle = title ? sanitizeInput(title) : null;
    
    // For JSON requests without title, use content as both title and content
    const postTitle = sanitizedTitle || contentValidation.sanitizedValue?.split(' ').slice(0, 5).join(' ') + '...';
    const postContent = contentValidation.sanitizedValue;
    
    if (!postContent) {
      return res.status(400).json({ 
        message: "Content is required",
        received: { title, content }
      });
    }
    
    const imageUrl = req.file ? "/uploads/" + req.file.filename : undefined;
    const post = await Post.create({
      title: postTitle,
      content: postContent,
      imageUrl,
      authorId: req.userId
    });
    const created = await Post.findByPk(post.id, {
      include: [{ model: User, as: "author", attributes: ["id", "firstName", "lastName", "username", "avatar"] }]
    });
    
    // Emit real-time post update to all connected users
    if (global.io) {
      global.io.emit('new_post', created);
    }
    
    return res.json(created);
  } catch (err) {
    console.error("Post creation error:", err);
    return res.status(400).json({ message: "Create error", error: err.message });
  }
});

router.delete("/:id", auth, async function (req, res) {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Not found" });
    }
    if (post.authorId !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Get all comments for this post first
    const comments = await Comment.findAll({ where: { postId: req.params.id } });
    const commentIds = comments.map(comment => comment.id);
    
    // Delete related records first to avoid foreign key constraints
    if (commentIds.length > 0) {
      await CommentLike.destroy({ where: { commentId: commentIds } });
    }
    await PostLike.destroy({ where: { postId: req.params.id } });
    await Comment.destroy({ where: { postId: req.params.id } });
    
    // Delete related notifications (post likes, comments, etc.)
    await Notification.destroy({ 
      where: { 
        relatedId: req.params.id,
        type: ['post_like', 'post_comment']
      } 
    });
    
    // Now delete the post
    await post.destroy();
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete post error:", err);
    return res.status(500).json({ message: "Delete error", error: err.message });
  }
});

// Like/Dislike a post
// Like/Dislike a post
router.post("/:id/like", auth, async function (req, res) {
  try {
    const { likeType } = req.body; // 'like' or 'dislike'
    const postId = req.params.id;
    const userId = req.userId;

    if (!['like', 'dislike'].includes(likeType)) {
      return res.status(400).json({ message: "Invalid like type" });
    }

    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Rate limiting: Check if user has made a like/dislike request in the last 1 second
    const oneSecondAgo = new Date(Date.now() - 1000);
    const recentLike = await PostLike.findOne({
      where: { 
        userId, 
        postId,
        updatedAt: { [Op.gte]: oneSecondAgo }
      }
    });

    if (recentLike) {
      // Return current state without creating duplicate
      const likesCount = await PostLike.count({
        where: { postId, likeType: 'like' }
      });
      const dislikesCount = await PostLike.count({
        where: { postId, likeType: 'dislike' }
      });
      
      const userLike = await PostLike.findOne({
        where: { userId, postId }
      });

      return res.json({
        postId: parseInt(postId),
        likesCount,
        dislikesCount,
        userLikeType: userLike?.likeType || null,
        userId: userId,
        message: "Rate limited - please wait"
      });
    }

    // Check if user already liked/disliked this post
    const existingLike = await PostLike.findOne({
      where: { userId, postId }
    });

    let shouldCreateNotification = false;

    if (existingLike) {
      if (existingLike.likeType === likeType) {
        // Remove like/dislike if clicking same button
        await existingLike.destroy();
        
        // Get updated counts
        const likesCount = await PostLike.count({
          where: { postId, likeType: 'like' }
        });
        const dislikesCount = await PostLike.count({
          where: { postId, likeType: 'dislike' }
        });

        const result = {
          postId: parseInt(postId),
          likesCount,
          dislikesCount,
          userLikeType: null,
          userId: userId // Add userId to identify who performed the action
        };

        // Emit real-time update
        if (global.io) {
          global.io.emit('post_like_updated', result);
        }

        return res.json(result);
      } else {
        // Update existing like/dislike to new type
        existingLike.likeType = likeType;
        await existingLike.save();
        shouldCreateNotification = true;
      }
    } else {
      // Create new like/dislike
      await PostLike.create({
        userId,
        postId,
        likeType
      });
      shouldCreateNotification = true;
    }

    // Create notification for post author if not their own post and should create notification
    if (shouldCreateNotification && post.authorId !== userId) {
      // Check for existing recent notification to prevent spam
      const recentNotification = await Notification.findOne({
        where: {
          userId: post.authorId,
          fromUserId: userId,
          type: likeType === 'like' ? 'post_like' : 'post_dislike',
          relatedId: postId,
          createdAt: { [Op.gte]: new Date(Date.now() - 5000) } // No duplicate notifications within 5 seconds
        }
      });

      if (!recentNotification) {
        const user = await User.findByPk(userId);
        const notification = await Notification.create({
          userId: post.authorId,
          fromUserId: userId,
          type: likeType === 'like' ? 'post_like' : 'post_dislike',
          message: `${user.firstName} ${user.lastName} ${likeType === 'like' ? 'liked' : 'disliked'} your post`,
          relatedId: postId
        });
        
        // Emit real-time notification
        if (global.io) {
          global.io.to(`user_${post.authorId}`).emit('new_notification', {
            id: notification.id,
            type: notification.type,
            message: notification.message,
            isRead: false,
            fromUser: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar
            },
            createdAt: notification.createdAt
          });
        }
      }
    }

    // Get updated counts
    const likesCount = await PostLike.count({
      where: { postId, likeType: 'like' }
    });
    const dislikesCount = await PostLike.count({
      where: { postId, likeType: 'dislike' }
    });

    const result = {
      postId: parseInt(postId),
      likesCount,
      dislikesCount,
      userLikeType: likeType,
      userId: userId // Add userId to identify who performed the action
    };

    // Emit real-time update
    if (global.io) {
      global.io.emit('post_like_updated', result);
    }

    return res.json(result);
  } catch (err) {
    console.error("Like/dislike error:", err);
    return res.status(500).json({ message: "Like/dislike error" });
  }
});

export default router;
