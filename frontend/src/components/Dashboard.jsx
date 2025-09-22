import React from 'react'
import { getFirstName, getUsername } from '../utils/auth'
import { useState } from 'react'
import { useEffect } from 'react'
import { useRef } from 'react'
import { FaSmile, FaSearch, FaUser } from 'react-icons/fa'
import { TbPhotoFilled } from "react-icons/tb";
import { BsFillSendFill } from 'react-icons/bs'
import { FaXmark } from "react-icons/fa6";
import { isActionAllowed } from '../utils/banUtils';
import EmojiPicker from './EmojiPicker';
import { useAlert } from './Alert';
import { Link } from 'react-router-dom';
import { BsPeopleFill } from "react-icons/bs";

// Suggestions component: fetches 4 random users (excluding current user) and displays them with improved styles
const Suggestions = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch 4 random users, excluding the current user
                const res = await fetch('/api/users/search?random=1&limit=4', { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch suggestions');
                const data = await res.json();
                setUsers(data);
            } catch (err) {
                setError('Could not load suggestions');
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, []);

    return (
        <div className="mt-8">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <BsPeopleFill className="mr-2 text-orange-500" /> People you may know
            </h3>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm min-w-72 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 p-4">
                {loading ? (
                    <div className="col-span-4 text-center text-gray-500 dark:text-gray-400 py-6">Loading...</div>
                ) : error ? (
                    <div className="col-span-4 text-center text-red-500 py-6">{error}</div>
                ) : users.length === 0 ? (
                    <div className="col-span-4 text-center text-gray-500 dark:text-gray-400 py-6">No suggestions found</div>
                ) : (
                    users.map(user => (
                        <Link
                            key={user.id}
                            to={`/profile/${user.id}`}
                            className="flex flex-col items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors border border-transparent hover:border-blue-400 dark:hover:border-blue-500 shadow-sm"
                        >
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.firstName}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 dark:border-blue-400 mb-2"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mb-2">
                                    <FaUser className="w-7 h-7 text-gray-500 dark:text-gray-400" />
                                </div>
                            )}
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

const Dashboard = ({ onPostCreated }) => {
    const [postContent, setPostContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const searchInputRef = useRef(null);
    const { showAlert } = useAlert();

    // Handle image selection
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('Image must be less than 5MB', 'error');
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                showAlert('Please select a valid image file', 'error');
                return;
            }

            setSelectedImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove selected image
    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Utility to escape < and > for backend validation
    const escapeHtml = (str) => {
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    const PostSomething = async () => {
        // Check if user is banned before allowing post creation
        const actionAllowed = await isActionAllowed('post');
        if (!actionAllowed) return;

        // CHECK IF postContent is empty
        if (postContent.trim() === '') {
            showAlert('Post content cannot be empty', 'warning');
            return;
        }

        // Escape < and > before sending to backend
        const safeContent = escapeHtml(postContent);

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('content', safeContent);

        if (selectedImage) {
            formData.append('image', selectedImage);
        }

        fetch('/api/posts', {
            method: 'POST',
            credentials: 'include',
            // Don't set Content-Type for FormData - browser will set it with boundary
            body: formData
        }).then((res) => res.json()).then((data) => {
            if (data.isValid === false) {
                showAlert(data.error || 'Failed to create post', 'error');
                return;
            }
            console.error('Error creating post:', data)
            setPostContent('')
            removeImage()
            textareaRef.current.style.height = 'auto'
            textareaRef.current.value = ''
        }).catch((error) => {
            console.error('Error creating post:', error)
        })
    }

    const handleInput = () => {
        const el = textareaRef.current
        if (el) {
            el.style.height = 'auto' // reset
            el.style.height = el.scrollHeight + 'px' // adjust
        }
    }

    const handleEmojiClick = (emoji) => {
        const cursorPosition = textareaRef.current.selectionStart;
        const newContent = postContent.slice(0, cursorPosition) + emoji + postContent.slice(cursorPosition);
        setPostContent(newContent);
        setShowEmojiPicker(false);

        // Focus back on textarea and set cursor position after emoji
        setTimeout(() => {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
        }, 0);
    };

    // Search users functionality
    const searchUsers = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=5`, {
                credentials: 'include'
            });

            if (response.ok) {
                const users = await response.json();
                setSearchResults(users);
                setShowSearchResults(true);
            } else {
                setSearchResults([]);
                setShowSearchResults(false);
            }
        } catch (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
            setShowSearchResults(false);
        } finally {
            setSearchLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            searchUsers(searchQuery);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Handle click outside search to close results
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="max-w-xl w-full mx-auto hidden md:block">
            {/* Main Content Area */}
            <div className="flex flex-col gap-3">
                {/* Post Creation - Takes up 3 columns */}
                <div className="">
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Create a post</h2>
                        </div>

                        {/* Content */}
                        <div className="p-0">
                            <textarea
                                ref={textareaRef}
                                onInput={handleInput}
                                rows={3}
                                className="w-full p-4  min-h-40 border-gray-300 dark:border-gray-600 resize-none focus:outline-none  focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-base leading-relaxed bg-white dark:bg-gray-700"
                                placeholder="What would you like to share?"
                                value={postContent}
                                onChange={e => setPostContent(e.target.value)}
                            />

                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="mt-4 relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="max-h-96 rounded-lg object-cover w-full border border-gray-200 dark:border-gray-600"
                                    />
                                    <button
                                        onClick={removeImage}
                                        className="absolute top-3 right-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                                    >
                                        <FaXmark size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4  bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-b-lg flex justify-between items-center">
                            <div className="flex items-center space-x-3 relative">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <TbPhotoFilled className="mr-2" size={16} />
                                    Insert
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                                    title="Add emoji"
                                >
                                    <FaSmile className="mr-2" size={16} />
                                    Emoji
                                </button>

                                <EmojiPicker
                                    showEmojiPicker={showEmojiPicker}
                                    setShowEmojiPicker={setShowEmojiPicker}
                                    onEmojiClick={handleEmojiClick}
                                    position="top"
                                />
                            </div>

                            <button
                                type="button"
                                className="inline-flex items-center py-2 px-4 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={PostSomething}
                                disabled={!postContent.trim()}
                            >
                                <BsFillSendFill className="mr-2" size={14} />
                                Share
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Takes up 1 column */}
                <div className="">

                    {/* User Search */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm w-full min-w-72">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-100 dark:border-gray-700 rounded-lg">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
                                Find People
                            </h3>
                        </div>
                        <div className="p-4">
                            <div className="relative" ref={searchInputRef}>
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                        onFocus={() => searchQuery && setShowSearchResults(true)}
                                    />
                                    {searchLoading && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Search Results Dropdown */}
                                {showSearchResults && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                                        {searchResults.length > 0 ? (
                                            <div className="py-1">
                                                {searchResults.map((user) => (
                                                    <Link
                                                        key={user.id}
                                                        to={`/profile/${user.id}`}
                                                        className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                        onClick={() => {
                                                            setShowSearchResults(false);
                                                            setSearchQuery('');
                                                        }}
                                                    >
                                                        <div className="flex-shrink-0">
                                                            {user.avatar ? (
                                                                <img
                                                                    src={`${user.avatar}`}
                                                                    alt={user.firstName}
                                                                    className="w-10 h-10 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                                                    <FaUser className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-3 flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                {user.firstName} {user.lastName}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                @{user.username}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : searchQuery && !searchLoading ? (
                                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                                No users found for "{searchQuery}"
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <Suggestions />
                </div>
            </div>
        </div>
    )
}

export default Dashboard
