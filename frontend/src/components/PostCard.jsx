import React, { useState, useEffect, useRef } from "react";
import { AiFillLike } from "react-icons/ai";
import { AiFillDislike } from "react-icons/ai";
import { FaTrash, FaTimes, FaEllipsisV, FaShare, FaCopy, FaLink } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getUsername, authFetchOptions, getUserId } from "../utils/auth.js";
import { useSocket } from "../contexts/SocketContext.jsx";
import { isActionAllowed } from "../utils/banUtils.js";
import CommentsSection from "./CommentsSection.jsx";
import { useAlert } from "./Alert";
import { useConfirm } from "./ConfirmAlert";

export default function PostCard({ post, onDelete }) {
  const { getPostLikeData } = useSocket();
  const [selectedImage, setSelectedImage] = useState(null);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [dislikesCount, setDislikesCount] = useState(post.dislikesCount || 0);
  const [userLikeType, setUserLikeType] = useState(post.userLikeType || null);
  const [isLiking, setIsLiking] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  
  const currentUsername = getUsername();
  const currentUserId = parseInt(getUserId());
  const dropdownRef = useRef(null);

  // Update local state when socket data changes
  useEffect(() => {
    const socketLikeData = getPostLikeData(post.id);
    if (socketLikeData) {

      // Always update the counts for everyone
      setLikesCount(socketLikeData.likesCount);
      setDislikesCount(socketLikeData.dislikesCount);
      
      // Only update userLikeType if this is the user who performed the action
      if (socketLikeData.userId === currentUserId) {
        setUserLikeType(socketLikeData.userLikeType);
      } else {
      }
    }
  }, [getPostLikeData, post.id, currentUserId]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      showAlert('Post link copied to clipboard!', 'success');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showAlert('Post link copied to clipboard!', 'success');
    }
    setShowDropdown(false);
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: `Post by ${post.author?.firstName || post.author?.username}`,
      text: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      url: postUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copy link
        await navigator.clipboard.writeText(postUrl);
        showAlert('Post link copied to clipboard!', 'success');
      }
    } catch (err) {
      console.log('Error sharing:', err);
      // Fallback to copy link
      handleCopyLink();
    }
  };

  const handleDeletePost = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    
    if (confirmed) {
      onDelete();
    }
    setShowDropdown(false);
  };

  const handleLike = async (likeType) => {
    // Check if user is banned before allowing like action
    const actionAllowed = await isActionAllowed('like');
    if (!actionAllowed) return;
    
    if (isLiking) return; // Prevent double-clicks
    
    setIsLiking(true);
    
    // Add a minimum delay between requests (debounce)
    setTimeout(() => setIsLiking(false), 1000); // 1 second cooldown
    
    // Optimistic update
    const isCurrentlyActive = userLikeType === likeType;
    const newUserLikeType = isCurrentlyActive ? null : likeType;
    
    // Calculate optimistic counts
    let newLikesCount = likesCount;
    let newDislikesCount = dislikesCount;
    
    if (userLikeType === 'like') {
      newLikesCount -= 1;
    } else if (userLikeType === 'dislike') {
      newDislikesCount -= 1;
    }
    
    if (newUserLikeType === 'like') {
      newLikesCount += 1;
    } else if (newUserLikeType === 'dislike') {
      newDislikesCount += 1;
    }
    
    // Update UI immediately
    setLikesCount(newLikesCount);
    setDislikesCount(newDislikesCount);
    setUserLikeType(newUserLikeType);
    
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ likeType })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update like');
      }
      
      const result = await response.json();
      
      // Update with server response (in case of discrepancies)
      setLikesCount(result.likesCount);
      setDislikesCount(result.dislikesCount);
      setUserLikeType(result.userLikeType);
      
    } catch (error) {
      console.error('Error updating like:', error);
      
      // Revert optimistic update on error
      setLikesCount(post.likesCount || 0);
      setDislikesCount(post.dislikesCount || 0);
      setUserLikeType(post.userLikeType || null);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-white dark:bg-gray-800 max-w-4xl max-h-4xl">
      <div className="flex items-center justify-between mb-2">
        <Link to={`/profile/${post.author?.id}`} className="flex items-center mb-2 gap-2">
          <img 
            src={post.author?.avatar ? 
              (post.author.avatar.startsWith('http') ? post.author.avatar : `${post.author.avatar}`) 
              : '/user-avatar.png'
            } 
            alt="" 
            className="w-10 h-10 rounded-full object-cover" 
          />
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 dark:text-white">
              {post.author?.firstName && post.author?.lastName 
                ? `${post.author.firstName} ${post.author.lastName}` 
                : post.author?.firstName || post.author?.username || 'Unknown User'
              }
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">@{post.author?.username || '[Deleted]'}</span>
          </div>
        </Link>
        
        {/* Three dots menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
            title="More options"
          >
            <FaEllipsisV size={16} />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="py-1">
                {post.author && currentUsername === post.author.username ? (
                  <button
                    onClick={handleDeletePost}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                  >
                    <FaTrash className="mr-3" size={14} />
                    Delete Post
                  </button>
                ) : (
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <FaLink className="mr-3" size={14} />
                    Copy Link
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: post.content }}></p>
      <span className="text-xm text-gray-500 dark:text-gray-400">Posted on {new Date(post.createdAt).toLocaleDateString('en-CA')}</span>
      {post.imageUrl && (
        <img 
          src={post.imageUrl.startsWith('http') ? post.imageUrl : `${post.imageUrl}`}
          alt="Post" 
          className="mt-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity duration-300 w-full max-h-[600px] object-cover" 
          onClick={() => setSelectedImage(post.imageUrl.startsWith('http') ? post.imageUrl : `${post.imageUrl}`)}
        />
      )}
      {/* like or dislike post */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1">
          <button
            className={`text-sm ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleLike('like')}
            disabled={isLiking}
          >
            <AiFillLike
              size={25}
              className={
                userLikeType === 'like'
                  ? "text-blue-500 transition-colors duration-300"
                  : "text-gray-400 transition-colors duration-300 hover:text-blue-400"
              }
            />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{likesCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className={`text-sm ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleLike('dislike')}
            disabled={isLiking}
          >
            <AiFillDislike
              size={25}
              className={
                userLikeType === 'dislike'
                  ? "text-red-500 transition-colors duration-300"
                  : "text-gray-400 transition-colors duration-300 hover:text-red-400"
              }
            />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{dislikesCount}</span>
        </div>
        
        {/* Share button */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="text-sm"
            title="Share post"
          >
            <FaShare
              size={20}
              className="text-gray-400 transition-colors duration-300 hover:text-blue-400"
            />
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <CommentsSection 
        postId={post.id} 
        initialCommentsCount={post.commentsCount || 0} 
      />

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl z-10"
            >
            </button>
            <img
              src={selectedImage?.startsWith('http') ? selectedImage : `${selectedImage}`}
              alt="Full size view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
