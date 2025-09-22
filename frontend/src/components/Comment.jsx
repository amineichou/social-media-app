import React, { useState, useContext } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FaHeart, FaCommentDots, FaEllipsisH, FaTrash } from 'react-icons/fa';
import { getUserId } from '../utils/auth';
import { useSocket } from '../contexts/SocketContext';
import { Link } from 'react-router-dom';

const Comment = ({ 
  comment, 
  postId, 
  onReply, 
  onDelete, 
  onLike, 
  isReply = false,
  depth = 0 
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [userHasLiked, setUserHasLiked] = useState(comment.userHasLiked || false);
  const [showActions, setShowActions] = useState(false);
  const currentUserId = getUserId();
  const { socket } = useSocket();

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    
    // Optimistic update
    const newLikesCount = userHasLiked ? likesCount - 1 : likesCount + 1;
    const newUserHasLiked = !userHasLiked;
    
    setLikesCount(newLikesCount);
    setUserHasLiked(newUserHasLiked);
    
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${comment.id}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to update like');
      }
      
      const result = await response.json();
      
      // Update with server response
      setLikesCount(result.likesCount);
      setUserHasLiked(result.userHasLiked);
      
      if (onLike) {
        onLike(comment.id, result);
      }
      
    } catch (error) {
      console.error('Error updating comment like:', error);
      
      // Revert optimistic update on error
      setLikesCount(comment.likesCount || 0);
      setUserHasLiked(comment.userHasLiked || false);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(comment.id, comment.author);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(comment.id);
    }
  };

  const canDelete = () => {
    // User can delete their own comments
    const currentUser = parseInt(currentUserId);
    const commentUserId = parseInt(comment.userId);
    const commentAuthorId = parseInt(comment.author?.id);
    
    console.log('Delete check:', {
      currentUserId,
      currentUser,
      commentUserId: comment.userId,
      commentAuthorId: comment.author?.id,
      parsedCommentUserId: commentUserId,
      parsedCommentAuthorId: commentAuthorId,
      match1: currentUser === commentUserId,
      match2: currentUser === commentAuthorId,
      canDelete: currentUser && (currentUser === commentUserId || currentUser === commentAuthorId)
    });
    
    return currentUser && (currentUser === commentUserId || currentUser === commentAuthorId);
  };

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });

  return (
    <div className={`flex space-x-3 ${isReply ? 'ml-8 mt-2' : 'mt-4'}`}>
      {/* Avatar */}
      <Link to={`/profile/${comment.author?.id}`} className="flex-shrink-0">
        <img
          src={comment.author?.avatar ? 
            (comment.author.avatar.startsWith('http') ? 
              comment.author.avatar : 
              `/${comment.author.avatar}`) 
            : '/user-avatar.png'
          }
          alt={`${comment.author?.firstName} ${comment.author?.lastName}`}
          className="w-8 h-8 rounded-full object-cover"
        />
      </Link>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        {/* Comment Bubble */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-3 py-2 inline-block max-w-full">
          <div className="flex items-center space-x-2 mb-1">
            <Link to={`/profile/${comment.author?.id}`} className="font-semibold text-sm text-gray-900 dark:text-white">
              {comment.author?.firstName} {comment.author?.lastName}
            </Link>
          </div>
          <p className="text-gray-800 dark:text-gray-200 text-sm break-words">
            {comment.content}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 mt-1 ml-3">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`text-xs font-semibold hover:underline transition-colors ${
              userHasLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400 hover:text-red-500'
            }`}
          >
            {userHasLiked ? 'Unlike' : 'Like'}
          </button>
          
          {!isReply && depth < 3 && (
            <button
              onClick={handleReply}
              className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:underline transition-colors"
            >
              Reply
            </button>
          )}
          
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timeAgo}
          </span>
          
          {likesCount > 0 && (
            <div className="flex items-center space-x-1">
              <FaHeart size={12} className="text-red-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{likesCount}</span>
            </div>
          )}

          {/* More Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
            >
              <FaEllipsisH size={14} />
            </button>
            
            {showActions && (
              <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[120px]">
                {canDelete() && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <FaTrash size={14} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Replies Section */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
            >
              <FaCommentDots size={12} />
              <span>
                {showReplies ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </span>
            </button>
            
            {showReplies && (
              <div className="mt-2">
                {comment.replies.map((reply) => (
                  <Comment
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    onReply={onReply}
                    onDelete={onDelete}
                    onLike={onLike}
                    isReply={true}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comment;
