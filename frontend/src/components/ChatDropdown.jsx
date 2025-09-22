import React, { useState, useEffect } from 'react';
import { IoChatbox, IoClose } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext.jsx';

const ChatDropdown = () => {
  const { unreadMessages, clearUnreadMessages, lastMessageNotification } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch recent chats when dropdown opens
  const fetchRecentChats = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/chats', {
        credentials: 'include'
      });
      if (response.ok) {
        const chats = await response.json();
        setRecentChats(chats.slice(0, 5)); // Show only 5 most recent
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle dropdown toggle
  const toggleDropdown = () => {
    if (!isOpen) {
      fetchRecentChats();
    }
    setIsOpen(!isOpen);
  };

  // Clear unread messages when dropdown is opened
  useEffect(() => {
    if (isOpen && unreadMessages > 0) {
      clearUnreadMessages();
    }
  }, [isOpen, unreadMessages, clearUnreadMessages]);

  // Get chat display name
  const getChatDisplayName = (chat) => {
    if (chat.isGroupChat) {
      return chat.groupName || 'Group Chat';
    }
    const participant = chat.participantDetails?.[0];
    return participant ? `${participant.firstName} ${participant.lastName}` : 'Unknown User';
  };

  // Get chat avatar
  const getChatAvatar = (chat) => {
    if (chat.isGroupChat) {
      return '/group-avatar.png';
    }
    const participant = chat.participantDetails?.[0];
    return participant?.avatar 
      ? `${participant.avatar}` 
      : '/user-avatar.png';
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="relative">
      {/* Chat Icon with Badge */}
      <button
        onClick={toggleDropdown}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors rounded-lg hover:bg-gray-100"
      >
        <IoChatbox className="w-6 h-6" />
        {unreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-pulse">
            {unreadMessages > 9 ? '9+' : unreadMessages}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Messages</h3>
            <Link
              to="/inbox"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              See all
            </Link>
          </div>

          {/* Latest Message Notification */}
          {lastMessageNotification && (
            <div className="p-3 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-800">
                  {lastMessageNotification.senderName}
                </span>
              </div>
              <p className="text-sm text-blue-700 truncate mt-1">
                {lastMessageNotification.content}
              </p>
              <span className="text-xs text-blue-600">
                {formatTime(lastMessageNotification.timestamp)}
              </span>
            </div>
          )}

          {/* Recent Chats */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading...
              </div>
            ) : recentChats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="mb-2">No conversations yet</p>
                <Link
                  to="/inbox"
                  onClick={() => setIsOpen(false)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Start a conversation
                </Link>
              </div>
            ) : (
              recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  to={`/inbox/${chat.participantDetails?.[0]?.id || ''}`}
                  onClick={() => setIsOpen(false)}
                  className="block p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={getChatAvatar(chat)}
                      alt={getChatDisplayName(chat)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 truncate">
                          {getChatDisplayName(chat)}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {chat.lastMessageAt && formatTime(chat.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage?.content || 'Start a conversation...'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <Link
              to="/inbox"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Open Messages
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatDropdown;
