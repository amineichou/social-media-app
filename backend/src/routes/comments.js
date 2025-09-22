import express from "express";
import Comment from "../models/Comment.js";
import CommentLike from "../models/CommentLike.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import auth from "../middleware/auth.js";
import { Op } from "sequelize";
import { validateField, sanitizeInput } from "../utils/validation.js";

const router = express.Router();

// Get comments for a post
router.get("/:postId/comments", auth, async function (req, res) {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'ASC' } = req.query;
    const userId = req.userId;

    // Verify post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const offset = (page - 1) * parseInt(limit);

    // Get top-level comments (no parent) with replies
    const comments = await Comment.findAndCountAll({
      where: { 
        postId: postId,
        parentId: null // Only top-level comments
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'firstName', 'lastName', 'avatar']
            },
            {
              model: CommentLike,
              as: 'likes',
              attributes: ['userId']
            }
          ]
        },
        {
          model: CommentLike,
          as: 'likes',
          attributes: ['userId']
        }
      ],
      order: [[sortBy, order], [{ model: Comment, as: 'replies' }, 'createdAt', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Process comments to add user-specific data
    const processedComments = comments.rows.map(comment => {
      const commentData = comment.toJSON();
      
      // Calculate likes count and user's like status
      const likesCount = commentData.likes?.length || 0;
      const userHasLiked = commentData.likes?.some(like => like.userId === userId) || false;
      
      // Process replies
      const processedReplies = commentData.replies?.map(reply => {
        const replyLikesCount = reply.likes?.length || 0;
        const replyUserHasLiked = reply.likes?.some(like => like.userId === userId) || false;
        
        return {
          ...reply,
          likesCount: replyLikesCount,
          userHasLiked: replyUserHasLiked,
          likes: undefined // Remove detailed likes from response
        };
      }) || [];

      return {
        ...commentData,
        likesCount,
        userHasLiked,
        replies: processedReplies,
        likes: undefined // Remove detailed likes from response
      };
    });

    return res.json({
      comments: processedComments,
      pagination: {
        total: comments.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(comments.count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Get comments error:", err);
    return res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// Create a comment
router.post("/:postId/comments", auth, async function (req, res) {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.userId;

    // Validate content
    const contentValidation = validateField('comment', content);
    if (!contentValidation.isValid) {
      return res.status(400).json({ 
        message: contentValidation.error
      });
    }

    // Verify post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // If parentId is provided, verify parent comment exists
    if (parentId) {
      const parentComment = await Comment.findOne({
        where: { id: parentId, postId: postId }
      });
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
    }

    // Rate limiting: Check if user has made a comment in the last 1 second
    const oneSecondAgo = new Date(Date.now() - 1000);
    const recentComment = await Comment.findOne({
      where: { 
        userId, 
        postId,
        createdAt: { [Op.gte]: oneSecondAgo }
      }
    });

    if (recentComment) {
      return res.status(429).json({ message: "Please wait before commenting again" });
    }

    // Create comment
    const comment = await Comment.create({
      content: contentValidation.sanitizedValue,
      postId,
      userId,
      parentId: parentId || null
    });

    // Update parent comment's replies count if this is a reply
    if (parentId) {
      await Comment.increment('repliesCount', {
        where: { id: parentId }
      });
    }

    // Get the created comment with author info
    const createdComment = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    const commentData = {
      ...createdComment.toJSON(),
      likesCount: 0,
      userHasLiked: false,
      replies: []
    };

    // Create notification for post author (if not commenting on own post)
    if (post.authorId !== userId) {
      // Check for recent notification to prevent spam
      const recentNotification = await Notification.findOne({
        where: {
          userId: post.authorId,
          fromUserId: userId,
          type: 'post_comment',
          relatedId: postId,
          createdAt: { [Op.gte]: new Date(Date.now() - 5000) }
        }
      });

      if (!recentNotification) {
        const user = await User.findByPk(userId);
        const notification = await Notification.create({
          userId: post.authorId,
          fromUserId: userId,
          type: 'post_comment',
          message: `${user.firstName} ${user.lastName} commented on your post`,
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

    // Emit real-time comment update
    if (global.io) {
      global.io.emit('new_comment', {
        postId: parseInt(postId),
        comment: commentData,
        isReply: !!parentId,
        parentId: parentId
      });
    }

    return res.status(201).json(commentData);
  } catch (err) {
    console.error("Create comment error:", err);
    return res.status(500).json({ message: "Failed to create comment" });
  }
});

// Like/Unlike a comment
router.post("/:postId/comments/:commentId/like", auth, async function (req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    // Check if comment exists
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Rate limiting: Check if user has made a like request in the last 1 second
    const oneSecondAgo = new Date(Date.now() - 1000);
    const recentLike = await CommentLike.findOne({
      where: { 
        userId, 
        commentId,
        updatedAt: { [Op.gte]: oneSecondAgo }
      }
    });

    if (recentLike) {
      const likesCount = await CommentLike.count({
        where: { commentId }
      });
      const userHasLiked = await CommentLike.findOne({
        where: { userId, commentId }
      });

      return res.json({
        commentId: parseInt(commentId),
        likesCount,
        userHasLiked: !!userHasLiked,
        message: "Rate limited - please wait"
      });
    }

    // Check if user already liked this comment
    const existingLike = await CommentLike.findOne({
      where: { userId, commentId }
    });

    if (existingLike) {
      // Remove like
      await existingLike.destroy();
      await Comment.decrement('likesCount', {
        where: { id: commentId }
      });
    } else {
      // Add like
      await CommentLike.create({ userId, commentId });
      await Comment.increment('likesCount', {
        where: { id: commentId }
      });
    }

    // Get updated counts
    const likesCount = await CommentLike.count({
      where: { commentId }
    });

    const result = {
      commentId: parseInt(commentId),
      likesCount,
      userHasLiked: !existingLike,
      userId: userId
    };

    // Emit real-time update
    if (global.io) {
      global.io.emit('comment_like_updated', result);
    }

    return res.json(result);
  } catch (err) {
    console.error("Comment like error:", err);
    return res.status(500).json({ message: "Failed to update comment like" });
  }
});

// Delete a comment
router.delete("/:postId/comments/:commentId", auth, async function (req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user owns the comment or the post
    const post = await Post.findByPk(comment.postId);
    if (comment.userId !== userId && post.authorId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    // If this is a reply, decrement parent's replies count
    if (comment.parentId) {
      await Comment.decrement('repliesCount', {
        where: { id: comment.parentId }
      });
    }

    // Delete the comment (this will also delete replies due to CASCADE)
    await comment.destroy();

    // Emit real-time update
    if (global.io) {
      global.io.emit('comment_deleted', {
        commentId: parseInt(commentId),
        postId: comment.postId,
        parentId: comment.parentId
      });
    }

    return res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Delete comment error:", err);
    return res.status(500).json({ message: "Failed to delete comment" });
  }
});

export default router;
