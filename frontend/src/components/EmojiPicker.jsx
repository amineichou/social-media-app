import React, { useRef, useEffect } from 'react';

const EmojiPicker = ({ showEmojiPicker, setShowEmojiPicker, onEmojiClick, position = 'bottom' }) => {
  const emojiPickerRef = useRef(null);

  // Most used emojis
  const mostUsedEmojis = [
    '😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😅',
    '😭', '😡', '🥺', '😴', '🤯', '🔥', '❤️', '👍',
    '👎', '😢', '😤', '🙄', '😋', '🤗', '😘', '🥳',
    '🤩', '🤪', '😇', '🤨', '😏', '🤤', '🥴', '😵'
  ];

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
  }, [showEmojiPicker, setShowEmojiPicker]);

  if (!showEmojiPicker) return null;

  const positionClasses = {
    bottom: 'bottom-8 left-0',
    top: 'top-8 left-0',
    bottomRight: 'bottom-8 right-0',
    topRight: 'top-8 right-0'
  };

  return (
    <div 
      ref={emojiPickerRef}
      className={`absolute ${positionClasses[position]} bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50 w-64`}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Most Used</div>
      <div className="grid grid-cols-8 gap-1">
        {mostUsedEmojis.map((emoji, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onEmojiClick(emoji)}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-lg"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
