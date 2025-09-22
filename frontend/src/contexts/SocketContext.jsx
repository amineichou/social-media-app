import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { getCookie } from '../utils/auth.js';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [postLikes, setPostLikes] = useState({});
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [lastMessageNotification, setLastMessageNotification] = useState(null);
  const [realtimeMessage, setRealtimeMessage] = useState(null);
  
  // Refs for managing socket state
  const socketRef = useRef(null);
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  // Function to fetch existing notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const notifications = await response.json();
        setNotifications(notifications || []);
        console.log('📄 Loaded existing notifications:', notifications?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Function to connect socket
    const connectSocket = () => {
        // Prevent multiple connection attempts
        if (isConnectingRef.current || socketRef.current?.connected) {
            console.log('🔄 SocketContext: Connection already exists or in progress');
            return;
        }

        isConnectingRef.current = true;
        
        // Don't try to read httpOnly cookies - they're not accessible to JavaScript
        // Just connect and let the server handle authentication via cookies
        console.log('🔄 SocketContext: Connecting with httpOnly cookie authentication...');

        const newSocket = io('', {
            withCredentials: true, // This sends httpOnly cookies automatically
            transports: ['polling', 'websocket'],
            timeout: 20000,
            forceNew: true
        });

        // Clear connecting flag once connection attempt is made
        newSocket.on('connect', () => {
            isConnectingRef.current = false;
        });

        newSocket.on('connect_error', () => {
            isConnectingRef.current = false;
        });

        newSocket.on('connect', () => {
            console.log('✅ SocketContext: Socket connected with ID:', newSocket.id);
            setIsConnected(true);
            reconnectAttempts.current = 0; // Reset reconnection attempts
            fetchNotifications(); // Fetch existing notifications on connect
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ SocketContext: Socket disconnected. Reason:', reason);
            setIsConnected(false);
            
            // Auto-reconnect unless it was a manual disconnect
            if (reason !== 'io client disconnect' && reason !== 'transport close') {
                setTimeout(() => {
                    if (reconnectAttempts.current < 5) {
                        console.log(`🔄 Attempting reconnection ${reconnectAttempts.current + 1}/5...`);
                        reconnectAttempts.current++;
                        connectSocket();
                    }
                }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)); // Exponential backoff
            }
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ SocketContext: Connection error:', error);
            setIsConnected(false);
            
            // Try to reconnect with exponential backoff
            if (reconnectAttempts.current < 5) {
                setTimeout(() => {
                    console.log(`🔄 Reconnecting after error (${reconnectAttempts.current + 1}/5)...`);
                    reconnectAttempts.current++;
                    connectSocket();
                }, Math.min(2000 * Math.pow(2, reconnectAttempts.current), 15000));
            }
        });

        newSocket.on('new_notification', (notification) => {
            console.log('📢 SocketContext: Received new notification:', notification);
            addNotification(notification);
            
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
                new Notification(notification.title || 'New Notification', {
                    body: notification.message,
                    icon: '/favicon.ico'
                });
            }
        });

        newSocket.on('admin_notification', (data) => {
            console.log('🔔 SocketContext: Received admin notification:', data);
            const adminNotification = {
                id: Date.now(),
                title: data.title || 'Admin Notification',
                message: data.message,
                type: 'admin',
                timestamp: new Date().toISOString()
            };
            addNotification(adminNotification);
            
            // Show browser notification
            if (Notification.permission === 'granted') {
                new Notification(adminNotification.title, {
                    body: adminNotification.message,
                    icon: '/favicon.ico'
                });
            }
        });

        // Real-time post updates
        newSocket.on('post_like_updated', (data) => {
            console.log('👍 SocketContext: Post like updated:', data);
            updatePostLike(data.postId, {
                likesCount: data.likesCount,
                dislikesCount: data.dislikesCount,
                userLikeType: data.userLikeType
            });
        });

        // Real-time new post
        newSocket.on('new_post', (post) => {
            console.log('📝 SocketContext: New post received:', post);
            addPost(post);
        });

        // Connection confirmation
        newSocket.on('connection_confirmed', (data) => {
            console.log('✅ SocketContext: Connection confirmed:', data);
        });

        // User online/offline status
        newSocket.on('user_online', (data) => {
            console.log('🟢 SocketContext: User came online:', data.userId);
        });

        newSocket.on('user_offline', (data) => {
            console.log('🔴 SocketContext: User went offline:', data.userId);
        });

        // Heartbeat mechanism
        newSocket.on('pong', (data) => {
            console.log('💓 SocketContext: Received pong:', data.timestamp);
        });

        // Real-time messaging
        newSocket.on('new_message', (data) => {
            console.log('💬 SocketContext: Received new message:', data);
            console.log('💬 SocketContext: Message data structure:', {
                chatId: data.chatId,
                messageId: data.message?.id,
                senderId: data.message?.senderId,
                content: data.message?.content,
                senderName: data.message?.sender?.firstName
            });
            
            setRealtimeMessage({
                chatId: data.chatId,
                message: data.message,
                timestamp: new Date().toISOString()
            });
            
            setLastMessageNotification({
                chatId: data.chatId,
                message: data.message,
                timestamp: new Date().toISOString()
            });
            
            setUnreadMessages(prev => {
                console.log('💬 SocketContext: Updating unread messages from', prev, 'to', prev + 1);
                return prev + 1;
            });
            
            // Show browser notification for new message
            if (Notification.permission === 'granted') {
                new Notification(`New message from ${data.message?.sender?.firstName || 'Someone'}`, {
                    body: data.message?.content || 'New message received',
                    icon: '/favicon.ico'
                });
            }
        });

        // Message sent confirmation
        newSocket.on('message_sent', (message) => {
            console.log('✅ SocketContext: Message sent confirmation:', message);
        });

        // Message error handling
        newSocket.on('message_error', (error) => {
            console.error('❌ SocketContext: Message error:', error);
        });

        // Start heartbeat interval
        const heartbeatInterval = setInterval(() => {
            if (newSocket.connected) {
                newSocket.emit('ping');
            }
        }, 30000); // Every 30 seconds

        // Clean up heartbeat on disconnect
        newSocket.on('disconnect', () => {
            clearInterval(heartbeatInterval);
        });

        setSocket(newSocket);
        socketRef.current = newSocket;
    };

    const disconnectSocket = () => {
        console.log('🔌 SocketContext: Manually disconnecting socket...');
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        
        setSocket(null);
        setIsConnected(false);
        isConnectingRef.current = false;
    };

  // Initialize socket connection once
  useEffect(() => {
    connectSocket();

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, []); // Empty dependency array - only run once

  const updatePosts = (newPosts) => {
    setPosts(newPosts);
  };

  const updateNotifications = (newNotifications) => {
    setNotifications(newNotifications);
  };

  const addPost = (post) => {
    setPosts(prev => [post, ...prev]);
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const getPostLikeData = (postId) => {
    return postLikes[postId] || null;
  };

  const updatePostLike = (postId, likeData) => {
    setPostLikes(prev => ({
      ...prev,
      [postId]: likeData
    }));
  };

  const clearUnreadMessages = () => {
    setUnreadMessages(0);
  };

  const markMessagesAsRead = (chatId) => {
    setUnreadMessages(0);
  };

  const markChatAsRead = (chatId) => {
    setUnreadMessages(0);
  };

  // Add functions for socket communication
  const emitMessage = (event, data) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Emitting ${event}:`, data);
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit message - socket not connected');
    }
  };

  const onMessage = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => socketRef.current?.off(event, callback);
    }
    return () => {}; // Return empty cleanup function if no socket
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      isConnecting: isConnectingRef.current,
      onlineUsers,
      posts,
      notifications,
      postLikes,
      unreadMessages,
      lastMessageNotification,
      realtimeMessage,
      updatePosts,
      updateNotifications,
      addPost,
      addNotification,
      getPostLikeData,
      updatePostLike,
      clearUnreadMessages,
      markMessagesAsRead,
      markChatAsRead,
      connectSocket,
      disconnectSocket,
      emitMessage,
      onMessage,
      fetchNotifications
    }}>
      {children}
    </SocketContext.Provider>
  );
};
