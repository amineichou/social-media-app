import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext.jsx';
import { isLoggedIn, getUserId } from '../../utils/auth.js';
import { IoPaperPlane, IoArrowBack, IoTrash } from 'react-icons/io5';
import { FaSmile } from 'react-icons/fa';
import EmojiPicker from '../../components/EmojiPicker';
import { useAlert } from '../../components/Alert';
import { useConfirm } from '../../components/ConfirmAlert';

const Inbox = () => {
  const { userId: chatUserId } = useParams();
  const { socket, clearUnreadMessages, markChatAsRead, realtimeMessage } = useSocket();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [page, setPage] = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const activeChatRef = useRef(null);
  const messageInputRef = useRef(null);

  // Update ref when activeChat changes and manage socket rooms
  useEffect(() => {
    document.title = "Inbox - Jupiter";

    console.log('🔄 Active chat changed:', activeChat);
    activeChatRef.current = activeChat;
    console.log('🔄 Active chat ref updated:', activeChatRef.current);

    // Join/leave socket rooms based on active chat
    if (socket && socket.connected) {
      if (activeChat) {
        console.log(`💬 Joining chat room: chat_${activeChat.id}`);
        socket.emit('join_chat', activeChat.id);
      }
    }

    // Cleanup function to leave the room when switching chats
    return () => {
      if (socket && socket.connected && activeChat) {
        console.log(`💬 Leaving chat room: chat_${activeChat.id}`);
        socket.emit('leave_chat', activeChat.id);
      }
    };
  }, [activeChat, socket]);

  // Handle realtime messages from SocketContext
  useEffect(() => {
    console.log('🔄 Realtime message useEffect triggered');
    console.log('🔄 realtimeMessage:', realtimeMessage);

    if (realtimeMessage && (realtimeMessage.timestamp || realtimeMessage.createdAt || realtimeMessage.chatId)) {
      const { chatId, message } = realtimeMessage;
      console.log('=== REALTIME MESSAGE DEBUG ===');
      console.log('Received realtime message data:', realtimeMessage);
      console.log('Extracted message:', message);
      console.log('Chat ID:', chatId, 'Type:', typeof chatId);
      console.log('Active chat:', activeChatRef.current);
      console.log('Active chat ID:', activeChatRef.current?.id, 'Type:', typeof activeChatRef.current?.id);
      console.log('IDs match?', activeChatRef.current?.id === chatId);
      console.log('IDs match (loose)?', activeChatRef.current?.id == chatId);

      // Update messages if this is the active chat
      if (activeChatRef.current && (activeChatRef.current.id === chatId || activeChatRef.current.id == chatId)) {
        console.log('✅ Adding message to active chat');
        setMessages(prev => {
          console.log('📋 Current messages before adding:', prev.length, prev);

          // Prevent duplicate messages by checking if message already exists
          const messageExists = prev.some(msg => msg.id === message.id);
          if (messageExists) {
            console.log('⚠️ Message already exists, skipping');
            return prev;
          }

          const newMessages = [...prev, message];
          console.log('✅ Updated messages count:', newMessages.length);
          console.log('✅ New message added:', message);
          console.log('📋 Final messages array:', newMessages);
          return newMessages;
        });
        // Auto-scroll to bottom for new messages
        setTimeout(scrollToBottom, 100);
      } else {
        console.log('❌ Message not for active chat or no active chat');
        console.log('Reason: activeChatRef.current =', activeChatRef.current);
        console.log('Reason: chatId =', chatId);
        console.log('Reason: activeChatRef.current?.id =', activeChatRef.current?.id);
      }

      // Update chats list - move chat to top and update last message
      setChats(prev => {
        // Check if chat already exists
        const existingChatIndex = prev.findIndex(chat => chat.id === chatId || chat.id == chatId);

        if (existingChatIndex >= 0) {
          // Update existing chat
          const updatedChats = [...prev];
          updatedChats[existingChatIndex] = {
            ...updatedChats[existingChatIndex],
            lastMessage: message,
            lastMessageAt: message.createdAt
          };

          // Move updated chat to top
          const updatedChat = updatedChats[existingChatIndex];
          updatedChats.splice(existingChatIndex, 1);
          return [updatedChat, ...updatedChats];
        } else {
          // If chat doesn't exist in current list, fetch updated chats
          console.log(`Chat ${chatId} not found in current list, fetching updated chats`);
          fetchChats();
          return prev;
        }
      });
      console.log('=== END DEBUG ===');
    }
  }, [realtimeMessage]);
  const [onlineUsers] = useState(new Set());

  // Auto-scroll to bottom for new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load more messages when scrolling to top
  const handleScroll = async () => {
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current;
      if (scrollTop === 0 && hasMoreMessages && !messagesLoading) {
        await loadMoreMessages();
      }
    }
  };

  // Fetch all chats
  const fetchChats = async () => {
    console.log('fetchChats called');

    try {
      const response = await fetch('/api/chats', {
        credentials: 'include'
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched chats data:', data);
        setChats(data);

        // If there's a chatUserId in params, find or create chat with that user
        if (chatUserId) {
          console.log('Looking for chat with user ID:', chatUserId);
          const existingChat = data.find(chat =>
            chat.participantDetails && chat.participantDetails.some(p => p.id === parseInt(chatUserId))
          );

          if (existingChat) {
            console.log('Found existing chat:', existingChat);
            setActiveChat(existingChat);
          } else {
            console.log('No existing chat found, creating new one');
            await createChatWithUser(chatUserId);
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch chats:', errorData);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  // Create chat with specific user
  const createChatWithUser = async (recipientId) => {
    console.log('createChatWithUser called with recipientId:', recipientId);

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ recipientId: parseInt(recipientId) })
      });

      console.log('Create chat response status:', response.status);

      if (response.ok) {
        const newChat = await response.json();
        console.log('Created new chat:', newChat);

        // Add the new chat to the chats list and set as active
        setChats(prev => [newChat, ...prev]);
        setActiveChat(newChat);
      } else {
        const errorData = await response.json();
        console.error('Failed to create chat:', errorData);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  // Fetch messages for active chat
  const fetchMessages = async (chatId, pageNum = 1, reset = true) => {
    if (!chatId) return;

    setMessagesLoading(true);
    try {
      const response = await fetch(
        `/api/chats/${chatId}/messages?page=${pageNum}&limit=20`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setMessages(data.messages);
          setPage(1);
        } else {
          setMessages(prev => [...data.messages, ...prev]);
        }
        setHasMoreMessages(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (activeChat && hasMoreMessages) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchMessages(activeChat.id, nextPage, false);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat || !socket) return;

    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: messageText,
      senderId: parseInt(getUserId()),
      createdAt: new Date().toISOString(),
      sender: {
        firstName: localStorage.getItem('firstName') || 'You',
        lastName: ''
      },
      isTemporary: true
    };

    // Add temporary message for immediate UI feedback
    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = messageText;
    setMessageText('');

    // Auto-scroll to bottom immediately
    setTimeout(scrollToBottom, 50);

    try {
      // Use Socket.io for real-time messaging
      socket.emit('send_message', {
        chatId: activeChat.id,
        content: messageToSend
      });

      // Listen for message confirmation
      const handleMessageSent = (data) => {
        if (data.chatId === activeChat.id) {
          console.log('✅ Message sent confirmation received:', data);
          // Replace temporary message with real one
          setMessages(prev =>
            prev.map(msg =>
              msg.id === tempMessage.id ? data : msg
            )
          );

          // Update chats list - move to top and update last message
          setChats(prev => {
            const updatedChats = prev.map(chat =>
              chat.id === activeChat.id
                ? { ...chat, lastMessage: data, lastMessageAt: data.createdAt }
                : chat
            );

            // Move active chat to top
            const updatedChat = updatedChats.find(chat => chat.id === activeChat.id);
            const otherChats = updatedChats.filter(chat => chat.id !== activeChat.id);

            return updatedChat ? [updatedChat, ...otherChats] : updatedChats;
          });

          // Remove listener after handling
          socket.off('message_sent', handleMessageSent);
        }
      };

      const handleMessageError = (error) => {
        console.error('❌ Message send error:', error);
        // Remove temporary message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setMessageText(messageToSend); // Restore the message text

        // Remove listeners
        socket.off('message_sent', handleMessageSent);
        socket.off('message_error', handleMessageError);
      };

      // Set up listeners for this message
      socket.on('message_sent', handleMessageSent);
      socket.on('message_error', handleMessageError);

      // Fallback timeout to clean up listeners
      setTimeout(() => {
        socket.off('message_sent', handleMessageSent);
        socket.off('message_error', handleMessageError);
      }, 10000); // 10 second timeout

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setMessageText(messageToSend); // Restore the message text
    }
  };

  // Delete conversation
  const deleteConversation = async (chatId) => {
    const confirmed = await showConfirm({
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete this conversation? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Remove chat from local state
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        // Clear active chat if it was the deleted one
        if (activeChat && activeChat.id === chatId) {
          setActiveChat(null);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to delete chat:', errorData);
        showAlert('Failed to delete conversation. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      showAlert('Failed to delete conversation. Please try again.', 'error');
    }
  };

  const handleEmojiClick = (emoji) => {
    const cursorPosition = messageInputRef.current.selectionStart || messageText.length;
    const newContent = messageText.slice(0, cursorPosition) + emoji + messageText.slice(cursorPosition);
    setMessageText(newContent);
    setShowEmojiPicker(false);

    // Focus back on input and set cursor position after emoji
    setTimeout(() => {
      messageInputRef.current.focus();
      messageInputRef.current.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
    }, 0);
  };

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      const handleChatCreated = (data) => {
        // Add new chat to the list
        setChats(prev => [data.chat, ...prev]);
      };

      const handleChatDeleted = (data) => {
        const { chatId } = data;
        // Remove chat from local state
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        // Clear active chat if it was the deleted one
        if (activeChat && activeChat.id === chatId) {
          setActiveChat(null);
        }
      };

      const handleUserOnline = (data) => {
        console.log('User came online:', data.userId);
        // Update online status if needed
      };

      const handleUserOffline = (data) => {
        console.log('User went offline:', data.userId);
        // Update offline status if needed
      };

      // Register event listeners (removed newMessage as it's handled by SocketContext)
      socket.on('chatCreated', handleChatCreated);
      socket.on('chatDeleted', handleChatDeleted);
      socket.on('userOnline', handleUserOnline);
      socket.on('userOffline', handleUserOffline);

      return () => {
        socket.off('chatCreated', handleChatCreated);
        socket.off('chatDeleted', handleChatDeleted);
        socket.off('userOnline', handleUserOnline);
        socket.off('userOffline', handleUserOffline);
      };
    }
  }, [socket]); // Remove activeChat dependency to prevent re-registration
  useEffect(() => {
    if (isLoggedIn()) {
      fetchChats();
      // Clear unread messages when entering inbox
      clearUnreadMessages();
    }
  }, []);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
      // Mark this chat as read
      markChatAsRead(activeChat.id);
      // Set global reference for socket context to know current chat
      window.activeChat = activeChat;
    }

    return () => {
      window.activeChat = null;
    };
  }, [activeChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  if (!isLoggedIn()) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Please Login</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to access messages</p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Loading chats...</h2>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Chat List Sidebar */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-gray-200 dark:border-gray-700 flex-col bg-white dark:bg-gray-800`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Messages</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="w-full px-5 py-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border-0 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No messages yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Start a conversation with your friends</p>
              <Link
                to="/profile"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Find friends
              </Link>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-4 border-b border-gray-50 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${activeChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={getChatAvatar(chat)}
                      alt={getChatDisplayName(chat)}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {chat.lastMessageAt && formatTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                      {chat.lastMessage?.content || 'Start a conversation'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white dark:bg-gray-900`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <button
                  className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  onClick={() => setActiveChat(null)}
                >
                  <IoArrowBack className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <div className="relative">
                  <img
                    src={getChatAvatar(activeChat)}
                    alt={getChatDisplayName(activeChat)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {getChatDisplayName(activeChat)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active now</p>
                </div>
              </div>

              {/* Chat Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => deleteConversation(activeChat.id)}
                  className="p-2 hover:bg-red-50 rounded-full text-red-500 hover:text-red-600 transition-colors"
                  title="Delete conversation"
                >
                  <IoTrash className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="bg-white dark:bg-gray-900 flex-1 overflow-y-auto p-6 space-y-4"
            >
              {messagesLoading && page > 1 && (
                <div className="text-center py-2">
                  <span className="text-sm text-gray-500">Loading...</span>
                </div>
              )}

              {messages.map((message, index) => {
                const isOwn = message.senderId === parseInt(getUserId());
                const showTime = index === messages.length - 1 ||
                  messages[index + 1]?.senderId !== message.senderId ||
                  new Date(messages[index + 1]?.createdAt) - new Date(message.createdAt) > 300000;

                return (
                  <div key={message.id}>
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl ${isOwn
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                          } ${message.isTemporary ? 'opacity-70' : ''}`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                    {showTime && (
                      <div className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                        {formatTime(message.createdAt)}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white p-4 border-t border-gray-100 relative dark:bg-gray-800 dark:border-gray-700">
              <form onSubmit={sendMessage} className="dark:bg-gray-800 flex items-center gap-3 px-4 py-3 bg-white/95">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                  title="Add emoji"
                >
                  <FaSmile size={20} />
                </button>

                {/* <div className="flex-1 relative dark:text-white"> */}
                  <input
                    type="text"
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Message..."
                    className="dark:bg-gray-800 dark:text-white w-full px-4 py-3 bg-gray-50 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white text-gray-800 placeholder-gray-400 transition-all"
                  />
                {/* </div> */}

                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className={
                    "p-3 rounded-full transition-colors flex items-center justify-center " +
                    (messageText.trim() && "bg-blue-500 text-white hover:bg-blue-600 shadow-md" || "bg-gray-100 text-gray-400 cursor-not-allowed")
                  }
                >
                  <IoPaperPlane size={24} />
                </button>
              </form>

              <div className='absolute bottom-80'>
                <EmojiPicker
                  showEmojiPicker={showEmojiPicker}
                  setShowEmojiPicker={setShowEmojiPicker}
                  onEmojiClick={handleEmojiClick}
                  position="top"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Messages</h3>
              <p className="text-gray-500 mb-6">Send private photos and messages to a friend</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
