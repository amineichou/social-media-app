import React, { useState, useEffect, useContext } from 'react';
import { FaCommentDots, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Comment from './Comment';
import CommentInput from './CommentInput';
import { useSocket } from '../contexts/SocketContext';
import { getUserId } from '../utils/auth';
import { useAlert } from './Alert';
import { useConfirm } from './ConfirmAlert';

const CommentsSection = ({ postId, initialCommentsCount = 0 }) => {
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const { socket } = useSocket();
  const currentUserId = getUserId();
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();

  // Real-time comment updates
  useEffect(() => {
    if (!socket) return;

    const handleNewComment = (data) => {
      if (data.postId === postId) {
        if (data.isReply && data.parentId) {
          // Add reply to parent comment
          setComments(prevComments => 
            prevComments.map(comment => {
              if (comment.id === data.parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), data.comment],
                  repliesCount: (comment.repliesCount || 0) + 1
                };
              }
              return comment;
            })
          );
        } else {
          // Add new top-level comment
          setComments(prevComments => [data.comment, ...prevComments]);
        }
        setCommentsCount(prev => prev + 1);
      }
    };

    const handleCommentLikeUpdate = (data) => {
      setComments(prevComments => 
        prevComments.map(comment => {
          // Update top-level comment
          if (comment.id === data.commentId) {
            return {
              ...comment,
              likesCount: data.likesCount,
              userHasLiked: data.userId === currentUserId ? data.userHasLiked : comment.userHasLiked
            };
          }
          
          // Update reply
          if (comment.replies) {
            const updatedReplies = comment.replies.map(reply => {
              if (reply.id === data.commentId) {
                return {
                  ...reply,
                  likesCount: data.likesCount,
                  userHasLiked: data.userId === currentUserId ? data.userHasLiked : reply.userHasLiked
                };
              }
              return reply;
            });
            
            if (JSON.stringify(updatedReplies) !== JSON.stringify(comment.replies)) {
              return { ...comment, replies: updatedReplies };
            }
          }
          
          return comment;
        })
      );
    };

    const handleCommentDeleted = (data) => {
      if (data.postId === postId) {
        if (data.parentId) {
          // Remove reply from parent comment
          setComments(prevComments => 
            prevComments.map(comment => {
              if (comment.id === data.parentId) {
                return {
                  ...comment,
                  replies: comment.replies?.filter(reply => reply.id !== data.commentId) || [],
                  repliesCount: Math.max(0, (comment.repliesCount || 0) - 1)
                };
              }
              return comment;
            })
          );
        } else {
          // Remove top-level comment
          setComments(prevComments => 
            prevComments.filter(comment => comment.id !== data.commentId)
          );
        }
        setCommentsCount(prev => Math.max(0, prev - 1));
      }
    };

    socket.on('new_comment', handleNewComment);
    socket.on('comment_like_updated', handleCommentLikeUpdate);
    socket.on('comment_deleted', handleCommentDeleted);

    return () => {
      socket.off('new_comment', handleNewComment);
      socket.off('comment_like_updated', handleCommentLikeUpdate);
      socket.off('comment_deleted', handleCommentDeleted);
    };
  }, [socket, postId, currentUserId]);

  const fetchComments = async (pageNum = 1, append = false) => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(
        `/api/posts/${postId}/comments?page=${pageNum}&limit=10&sortBy=createdAt&order=ASC`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      
      if (append) {
        setComments(prev => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }
      
      setHasMore(data.pagination.page < data.pagination.totalPages);
      setCommentsCount(data.pagination.total);
      
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchComments(nextPage, true);
    }
  };

  const handleCommentSubmit = (newComment, parentId) => {
    // Real-time update will handle this via socket
    setReplyingTo(null);
  };

  const handleReply = (commentId, author) => {
    setReplyingTo({
      commentId,
      author: `${author.firstName} ${author.lastName}`
    });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = await showConfirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Real-time update will handle the removal via socket
    } catch (error) {
      console.error('Error deleting comment:', error);
      showAlert('Failed to delete comment', 'error');
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
      {/* Comments Toggle Button */}
      <button
        onClick={handleToggleComments}
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors w-full mb-3"
      >
        <FaCommentDots size={16} />
        <span className="text-sm font-medium">
          {commentsCount > 0 ? `${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}` : 'Add a comment'}
        </span>
        {showComments ? <FaChevronUp size={16} /> : <FaChevronDown size={16} />}
      </button>

      {/* Comments Section */}
      {showComments && (
        <div className="space-y-1">
          {/* Main Comment Input */}
          <CommentInput
            postId={postId}
            onSubmit={handleCommentSubmit}
            placeholder="Write a comment..."
          />

          {/* Comments List */}
          {comments.length > 0 && (
            <div className="mt-4 space-y-1">
              {comments.map((comment) => (
                <div key={comment.id}>
                  <Comment
                    comment={comment}
                    postId={postId}
                    onReply={handleReply}
                    onDelete={handleDeleteComment}
                  />
                  
                  {/* Reply Input */}
                  {replyingTo && replyingTo.commentId === comment.id && (
                    <div className="ml-11 mt-2">
                      <CommentInput
                        postId={postId}
                        parentId={comment.id}
                        onSubmit={handleCommentSubmit}
                        onCancel={handleCancelReply}
                        placeholder={`Reply to ${replyingTo.author}...`}
                        autoFocus={true}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-gray-500 transition-colors"
                >
                  {loading ? 'Loading...' : 'Load more comments'}
                </button>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && comments.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Loading comments...
            </div>
          )}

          {/* Empty State */}
          {!loading && comments.length === 0 && commentsCount === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No comments yet. Be the first to comment!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
