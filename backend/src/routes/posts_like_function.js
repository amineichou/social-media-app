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
          relatedPostId: postId,
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
          relatedPostId: postId
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
