import React, { useState, useRef } from "react";
import { useSocket } from "../contexts/SocketContext.jsx";
import { useNavigate } from "react-router-dom";
import { FaImage, FaTimes, FaArrowLeft, FaSmile } from "react-icons/fa";
import EmojiPicker from "../components/EmojiPicker";
import { useAlert } from "../components/Alert";

export default function NewPost({ onCreated }) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const { addPost } = useSocket();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  document.title = "Create New Post - Jupiter";

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const form = new FormData();
      form.append("content", content);
      if (file) {
        form.append("image", file);
      }

      const resp = await fetch("/api/posts", {
        method: "POST",
        credentials: 'include',
        body: form
      });
      
      if (resp.ok) {
        const data = await resp.json();
        
        // Clear form
        setContent("");
        setFile(null);
        setImagePreview(null);
        
        // Navigate to home to see the new post
        navigate('/');
        
        if (onCreated) {
          onCreated(data);
        }
      } else {
        let errorMessage = 'Failed to create post';
        try {
          // Clone the response so we can try different parsing methods
          const responseClone = resp.clone();
          try {
            const error = await resp.json();
            errorMessage = error.message || errorMessage;
          } catch (jsonError) {
            // If JSON parsing fails, try reading as text from the cloned response
            const errorText = await responseClone.text();
            console.error('Server error response:', errorText);
            
            // Check for specific error types
            if (errorText.includes('MulterError: File too large')) {
              errorMessage = 'Image file is too large. Please select an image smaller than 5MB.';
            } else if (errorText.includes('MulterError')) {
              errorMessage = 'Error uploading image. Please try a different image file.';
            } else {
              errorMessage = `Server error (${resp.status}): ${resp.statusText}`;
            }
          }
        } catch (error) {
          console.error('Failed to read error response:', error);
          errorMessage = `Server error (${resp.status}): ${resp.statusText}`;
        }
        showAlert(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showAlert('Failed to create post', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      
      // Check file size (5MB limit to match backend)
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (selectedFile.size > maxSizeInBytes) {
        showAlert(`File size too large. Please select an image smaller than 5MB. Current file size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`, 'error');
        return;
      }
      
      // Check file type
      if (!selectedFile.type.startsWith('image/')) {
        showAlert('Please select an image file (JPG, PNG, GIF, etc.)', 'error');
        return;
      }
      
      setFile(selectedFile);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeImage = () => {
    setFile(null);
    setImagePreview(null);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <FaArrowLeft size={16} />
            <span>Back to Home</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Post</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Share what's on your mind with the community</p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <form onSubmit={submit} className="p-6 space-y-6">
            {/* Content Textarea */}
            <div className="relative">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content
              </label>
              <textarea
                id="content"
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, experiences, or anything interesting..."
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none bg-white dark:bg-gray-700"
              />
              
              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute bottom-3 right-3 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
                title="Add emoji"
              >
                <FaSmile size={20} />
              </button>
              
              <EmojiPicker 
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                onEmojiClick={handleEmojiClick}
                position="bottomRight"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Add Image (Optional)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Maximum file size: 5MB • Supported formats: JPG, PNG, GIF, WEBP
              </p>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <FaImage className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <div className="text-gray-600 dark:text-gray-400 mb-4">
                    <p className="text-lg">Add a photo to your post</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Drag and drop or click to select</p>
                  </div>
                  <label htmlFor="file-upload" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer">
                    <FaImage className="mr-2" />
                    Choose Image
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-3 right-3 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                  >
                    <FaTimes size={14} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                    <p className="text-white text-sm">
                      {file?.name}
                    </p>
                    <p className="text-white text-xs opacity-75">
                      {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  'Share Post'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tips
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Tips for great posts</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Keep your title clear and engaging</li>
            <li>• Add relevant details in the content</li>
            <li>• High-quality images get more engagement</li>
            <li>• Be authentic and share your perspective</li>
          </ul>
        </div> */}
      </div>
    </div>
  );
}
