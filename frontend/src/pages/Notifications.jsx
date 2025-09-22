import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext.jsx';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaComment, FaUserPlus, FaCheck, FaTimes } from 'react-icons/fa';

const Notifications = () => {
  const { notifications: socketNotifications } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'friend_requests', 'post_activity'
  const navigate = useNavigate();

  // Merge socket notifications with fetched notifications
  useEffect(() => {
    const allNotifications = [...socketNotifications, ...notifications];
    const uniqueNotifications = allNotifications.filter((notification, index, self) =>
      index === self.findIndex(n => n.id === notification.id)
    );
    setNotifications(uniqueNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, [socketNotifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );

    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        credentials: 'include'
      });
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleAcceptFriend = async (fromUserId, notificationId) => {
    try {
      const response = await fetch(`/api/friends/accept/${fromUserId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        markAsRead(notificationId);
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleDeclineFriend = async (fromUserId, notificationId) => {
    try {
      const response = await fetch(`/api/friends/decline/${fromUserId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        markAsRead(notificationId);
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  useEffect(() => {
    document.title = `(${notifications.filter(n => !n.isRead).length}) Notifications - Jupiter`;
    fetchNotifications();
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request': return <FaUserPlus className="text-blue-500" />;
      case 'friend_accepted': return <FaCheck className="text-green-500" />;
      case 'post_like': return <FaHeart className="text-red-500" />;
      case 'post_dislike': return <FaHeart className="text-gray-500" />;
      case 'post_comment': return <FaComment className="text-blue-500" />;
      default: return <FaCheck className="text-gray-500" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'friend_requests':
        return notification.type === 'friend_request';
      case 'post_activity':
        return ['post_like', 'post_dislike', 'post_comment'].includes(notification.type);
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const friendRequestCount = notifications.filter(n => n.type === 'friend_request' && !n.isRead).length;
  const postActivityCount = notifications.filter(n => ['post_like', 'post_dislike', 'post_comment'].includes(n.type) && !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between p-10 h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FaArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full font-medium">
                  {unreadCount} 
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-50 dark:bg-gray-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('friend_requests')}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'friend_requests'
                  ? 'bg-blue-50 dark:bg-gray-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Friend Requests ({friendRequestCount})
            </button>
            <button
              onClick={() => setFilter('post_activity')}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'post_activity'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Posts ({postActivityCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {filter === 'all' ? 'No notifications yet' : `No ${filter.replace('_', ' ')} notifications`}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'all' 
                  ? "When you get notifications, they'll appear here" 
                  : 'Try switching to a different filter to see more notifications'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 dark:border-l-blue-400' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                      
                      {notification.type === 'friend_request' && !notification.isRead && (
                        <div className="mt-3 flex space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const userId = notification.fromUserId || notification.FromUser?.id;
                              if (userId) {
                                handleAcceptFriend(userId, notification.id);
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <FaCheck size={14} />
                            Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const userId = notification.fromUserId || notification.FromUser?.id;
                              if (userId) {
                                handleDeclineFriend(userId, notification.id);
                              }
                            }}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center gap-2"
                          >
                            <FaTimes size={14} />
                            Decline
                          </button>
                        </div>
                      )}

                      {!notification.isRead && notification.type !== 'friend_request' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
