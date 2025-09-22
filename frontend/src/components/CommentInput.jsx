import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaSmile } from 'react-icons/fa';
import { getUserId } from '../utils/auth';
import { isActionAllowed } from '../utils/banUtils';
import { useAlert } from './Alert';

const CommentInput = ({ 
  postId, 
  parentId = null, 
  placeholder = "Write a comment...", 
  onSubmit, 
  onCancel,
  autoFocus = false 
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAvatar, setUserAvatar] = useState('/user-avatar.png');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const currentUserId = getUserId();
  const { showAlert } = useAlert();

  // Most used emojis
  const mostUsedEmojis = [
    '😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😅',
    '😭', '😡', '🥺', '😴', '🤯', '🔥', '❤️', '👍',
    '👎', '😢', '😤', '🙄', '😋', '🤗', '😘', '🥳',
    '🤩', '🤪', '😇', '🤨', '😏', '🤤', '🥴', '😵'
  ];

  // Fetch user avatar
  useEffect(() => {
    const fetchUserAvatar = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          if (userData.avatar) {
            setUserAvatar(`/${userData.avatar}`);
          }
        }
      } catch (error) {
        console.error('Error fetching user avatar:', error);
      }
    };

    if (currentUserId) {
      fetchUserAvatar();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is banned before allowing comment
    const actionAllowed = await isActionAllowed('comment');
    if (!actionAllowed) return;
    
    if (!content.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          parentId: parentId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Server response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        throw new Error(errorData.message || 'Failed to post comment');
      }

      const newComment = await response.json();
      
      // Clear the input
      setContent('');
      
      // Notify parent component
      if (onSubmit) {
        onSubmit(newComment, parentId);
      }

    } catch (error) {
      console.error('Error posting comment:', error);
      showAlert('Failed to post comment: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCancel = () => {
    setContent('');
    if (onCancel) {
      onCancel();
    }
  };

  const handleEmojiClick = (emoji) => {
    const cursorPosition = textareaRef.current.selectionStart;
    const newContent = content.slice(0, cursorPosition) + emoji + content.slice(cursorPosition);
    setContent(newContent);
    setShowEmojiPicker(false);
    
    // Focus back on textarea and set cursor position after emoji
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
    }, 0);
  };

  return (
    <div className="flex space-x-3 mt-3">
      {/* User Avatar */}
      <div className="flex-shrink-0">
        <img
          src={userAvatar}
          alt="Your avatar"
          className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
          onError={(e) => {
            e.target.src = '/user-avatar.png'; // Fallback to default avatar
          }}
        />
      </div>

      {/* Comment Input */}
      <div className="flex-1">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-2xl resize-none outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            rows="1"
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={isSubmitting}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2 relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Add emoji"
              >
                <FaSmile size={16} />
              </button>
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div 
                  ref={emojiPickerRef}
                  className="absolute bottom-8 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50 w-64"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Most Used</div>
                  <div className="grid grid-cols-8 gap-1">
                    {mostUsedEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-lg"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {parentId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
              
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2 ${
                  content.trim() && !isSubmitting
                    ? 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <FaPaperPlane size={14} />
                <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentInput;
