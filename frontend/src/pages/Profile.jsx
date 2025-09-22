import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard.jsx';
import { FaCalendar, FaTimes, FaBan } from "react-icons/fa";
import { useAlert } from '../components/Alert';

const Profile = () => {

    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [friendStatus, setFriendStatus] = React.useState('none');
    const [friends, setFriends] = React.useState([]);
    const [mutualFriends, setMutualFriends] = React.useState([]);
    const [messageLoading, setMessageLoading] = React.useState(false);
    const [posts, setPosts] = React.useState([]);
    const [postsLoading, setPostsLoading] = React.useState(false);
    const [postsPage, setPostsPage] = React.useState(1);
    const [hasMorePosts, setHasMorePosts] = React.useState(true);
    const [totalPosts, setTotalPosts] = React.useState(0);

    const { userId } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const fetchPosts = async (page = 1, reset = false) => {
        if (postsLoading) return;
        
        setPostsLoading(true);
        try {
            const targetUserId = userId || 'me';
            const response = await fetch(`/api/users/${targetUserId}/posts?page=${page}&limit=5`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (reset) {
                    setPosts(data.posts);
                } else {
                    setPosts(prev => [...prev, ...data.posts]);
                }
                setHasMorePosts(data.hasMore);
                setTotalPosts(data.total);
            } else {
                console.error('Failed to fetch posts:', response.status);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setPostsLoading(false);
        }
    };

    const loadMorePosts = () => {
        if (hasMorePosts && !postsLoading) {
            setPostsPage(prev => prev + 1);
            fetchPosts(postsPage + 1, false);
        }
    };

    // Infinite scroll handler
    React.useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || postsLoading) {
                return;
            }
            loadMorePosts();
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMorePosts, postsLoading, postsPage]);



    React.useEffect(() => {
        const fetchUserData = async () => {
            try {
                if (userId) {
                    // Fetch other user's profile
                    const userResponse = await fetch(`/api/users/${userId}`, {
                        credentials: 'include'
                    });
                    const userData = await userResponse.json();
                    setUser(userData);
                    document.title = `${userData.firstName} ${userData.lastName} | Profile`;

                    // Check friendship status
                    const statusResponse = await fetch(`/api/friends/status/${userId}`, {
                        credentials: 'include'
                    });
                    const statusData = await statusResponse.json();
                    setFriendStatus(statusData.status);

                    // Fetch mutual friends if not the current user
                    const mutualResponse = await fetch(`/api/friends/mutual/${userId}`, {
                        credentials: 'include'
                    });
                    const mutualData = await mutualResponse.json();
                    setMutualFriends(mutualData);
                } else {
                    // Fetch current user's profile
                    const userResponse = await fetch(`/api/users/me`, {
                        credentials: 'include'
                    });
                    const userData = await userResponse.json();
                    setUser(userData);

                    // Fetch friends list for current user
                    const friendsResponse = await fetch(`/api/friends`, {
                        credentials: 'include'
                    });
                    const friendsData = await friendsResponse.json();
                    setFriends(friendsData);
                    setFriendStatus('self');
                    document.title = "My Profile"
                }
                
                // Fetch posts separately with pagination
                setPosts([]);
                setPostsPage(1);
                fetchPosts(1, true);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId]);

    const handleFriendRequest = async () => {
        try {
            if (friendStatus === 'none') {
                // Send friend request
                const response = await fetch(`/api/friends/request/${userId}`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    setFriendStatus('sent');
                }
            } else if (friendStatus === 'received') {
                // Accept friend request
                const response = await fetch(`/api/friends/accept/${userId}`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    setFriendStatus('friends');
                    // Refresh friends list if on own profile
                    if (!userId) {
                        const friendsResponse = await fetch(`/api/friends`, {
                            credentials: 'include'
                        });
                        const friendsData = await friendsResponse.json();
                        setFriends(friendsData);
                    }
                }
            } else if (friendStatus === 'friends') {
                // Remove friend
                const response = await fetch(`/api/friends/${userId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    setFriendStatus('none');
                    // Refresh friends list if on own profile
                    if (!userId) {
                        const friendsResponse = await fetch(`/api/friends`, {
                            credentials: 'include'
                        });
                        const friendsData = await friendsResponse.json();
                        setFriends(friendsData);
                    }
                }
            }
        } catch (error) {
            console.error('Error handling friend request:', error);
        }
    };

    const handleMessage = async () => {
        if (friendStatus !== 'friends') {
            showAlert('You can only message friends. Send a friend request first!', 'warning');
            return;
        }

        setMessageLoading(true);
        try {
            // Create or get existing chat with this user
            const response = await fetch('/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ recipientId: parseInt(userId) })
            });

            if (response.ok) {
                const chat = await response.json();
                // Navigate to inbox with this user
                navigate(`/inbox/${userId}`);
            } else {
                const errorData = await response.json();
                console.error('Chat creation failed:', errorData);
                throw new Error(errorData.message || 'Failed to create chat');
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            showAlert('Failed to start conversation. Please try again.', 'error');
        } finally {
            setMessageLoading(false);
        }
    };

    const getFriendButtonText = () => {
        switch (friendStatus) {
            case 'none': return 'Add Friend';
            case 'sent': return 'Request Sent';
            case 'received': return 'Accept Request';
            case 'friends': return 'Remove Friend';
            case 'self': return null;
            default: return 'Add Friend';
        }
    };

    const getFriendButtonStyle = () => {
        if (friendStatus === 'friends') {
            return "px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md hover:shadow-lg";
        } else if (friendStatus === 'sent') {
            return "px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium shadow-md";
        } else if (friendStatus === 'received') {
            return "px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md hover:shadow-lg";
        } else {
            return "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg";
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className='flex flex-col items-center justify-center min-h-screen dark:bg-gray-800'>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">User not found</h2>
                <p className="text-gray-600 dark:text-gray-400">The user you're looking for doesn't exist.</p>
            </div>
        );
    }

    return (
        <div className='max-w-5xl mx-auto py-10 min-h-screen bg-gray-100 dark:bg-gray-900'>
            {/* Profile Header - No Cover */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* Avatar Section */}
                    <div className="flex-shrink-0">
                        <div className="relative">
                            <img
                                src={user?.avatar ?
                                    (user.avatar.startsWith('http') ? user.avatar : `${user.avatar}`)
                                    : "/user-avatar.png"
                                }
                                alt="Avatar"
                                className="w-44 h-44 rounded-full border-4 border-gray-100 dark:border-gray-700 object-cover bg-white dark:bg-gray-700 cursor-pointer transition-all duration-300"
                                onClick={() => setSelectedImage(user?.avatar ?
                                    (user.avatar.startsWith('http') ? user.avatar : `${user.avatar}`)
                                    : "/user-avatar.png"
                                )}
                            />
                            {/* Online Status Indicator */}
                            <div className="absolute bottom-4 right-4 w-6 h-6 bg-green-400 border-4 border-white dark:border-gray-800 rounded-full">
                            </div>
                        </div>
                    </div>

                    {/* User Info Section */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="mb-4">
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                {user?.firstName && user?.lastName
                                    ? `${user.firstName} ${user.lastName}`
                                    : user?.username || "Unknown User"
                                }
                            </h1>
                            <p className="text-xl text-gray-500 dark:text-gray-400 mb-4">@{user?.username || "unknown"}</p>

                            {/* Banned Status Warning */}
                            {user?.isBanned && (
                                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="flex items-center justify-center md:justify-start">
                                        <div className="flex items-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                                                <FaBan className="mr-2" />
                                                BANNED
                                            </span>
                                        </div>
                                    </div>
                                    {user?.banReason && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center md:text-left">
                                            Reason: {user.banReason}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* User Info Badges */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                                {/* {user?.birthday && (
                                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm">
                                        <BsCalendar2DateFill size={14} />
                                        <span>Born {new Date(user.birthday).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}</span>
                                    </div>
                                )} */}

                                {user?.gender && (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-full text-sm capitalize">
                                        {user.gender}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded-full text-sm">
                                    <FaCalendar size={14} />
                                    <span>Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long'
                                    }) : "N/A"}</span>
                                </div>
                            </div>

                            {/* Stats Section */}
                            <div className="flex justify-center md:justify-start gap-8 mb-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalPosts}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Posts</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {friendStatus === 'self' ? friends.length : mutualFriends.length}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {friendStatus === 'self' ? 'Friends' : 'Mutual Friends'}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Likes</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {friendStatus === 'self' ? (
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/edit-profile"
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg text-center"
                            >
                                Edit Profile
                            </Link>
                            <Link to="/settings" className="text-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium">
                                Settings
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <button
                                className={getFriendButtonStyle()}
                                onClick={handleFriendRequest}
                                disabled={friendStatus === 'sent'}
                            >
                                {getFriendButtonText()}
                            </button>
                            <button
                                className={`px-6 py-3 rounded-lg font-medium transition-colors ${friendStatus === 'friends'
                                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer shadow-md hover:shadow-lg'
                                        : 'border border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                                    }`}
                                onClick={handleMessage}
                                disabled={friendStatus !== 'friends' || messageLoading}
                                title={friendStatus !== 'friends' ? 'You can only message friends' : 'Send a message'}
                            >
                                {messageLoading ? 'Starting chat...' : 'Message'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Responsive Posts & Friends Section */}
            <div className="mb-16 flex flex-col md:flex-row gap-8 md:gap-16">
                {/* Friends List - Right on desktop */}
                <div className="w-full md:w-1/3">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {friendStatus === 'self' ? 'Friends' : 'Friends in Common'}
                    </h2>
                    <div className="space-y-4">
                        {friendStatus === 'self' && friends.length > 0 ? (
                            friends.map((friend) => (
                                <div
                                    key={friend.id}
                                    className="flex items-center justify-between p-3 rounded-lg dark:hover:bg-gray-800 hover:bg-gray-200 transition-colors"
                                >
                                    <Link
                                        to={`/profile/${friend.id}`}
                                        className="flex items-center flex-1 cursor-pointer"
                                    >
                                        <img
                                            src={friend.avatar ?
                                                (friend.avatar.startsWith('http') ? friend.avatar : `${friend.avatar}`)
                                                : '/user-avatar.png'
                                            }
                                            alt={friend.firstName || friend.username}
                                            className="w-12 h-12 rounded-full object-cover mr-3"
                                        />
                                        <div>
                                            <div className="font-semibold dark:text-white text-gray-900">
                                                {friend.firstName && friend.lastName
                                                    ? `${friend.firstName} ${friend.lastName}`
                                                    : friend.username
                                                }
                                            </div>
                                            <div className="text-sm text-gray-500">@{friend.username}</div>
                                        </div>
                                    </Link>
                                    <Link
                                        to={`/inbox/${friend.id}`}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Message
                                    </Link>
                                </div>
                            ))
                        ) : friendStatus === 'self' ? (
                            <div className="text-gray-500 ">No friends added yet.</div>
                        ) : mutualFriends.length > 0 ? (
                            mutualFriends.map((friend) => (
                                <div
                                    key={friend.id}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <Link
                                        to={`/profile/${friend.id}`}
                                        className="flex items-center flex-1 cursor-pointer"
                                    >
                                        <img
                                            src={friend.avatar ?
                                                (friend.avatar.startsWith('http') ? friend.avatar : `${friend.avatar}`)
                                                : '/user-avatar.png'
                                            }
                                            alt={friend.firstName || friend.username}
                                            className="w-12 h-12 rounded-full object-cover mr-3"
                                        />
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white hover:text-blue-600">
                                                {friend.firstName && friend.lastName
                                                    ? `${friend.firstName} ${friend.lastName}`
                                                    : friend.username
                                                }
                                            </div>
                                            <div className="text-sm text-gray-500">@{friend.username}</div>
                                        </div>
                                    </Link>
                                    <span className="text-xs text-gray-400  px-2 py-1 bg-gray-100 rounded">
                                        Mutual friend
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-500">
                                {friendStatus === 'self' ? 'No friends added yet.' : 'No friends in common.'}
                            </div>
                        )}
                    </div>
                </div>
                {/* Posts Section - Left on desktop */}
                <div className="w-full md:w-2/3">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Posts</h2>
                    {posts.length === 0 && !postsLoading ? (
                        <div className="text-gray-500">No posts yet.</div>
                    ) : (
                        <div className="space-y-6">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                            
                            {/* Loading indicator */}
                            {postsLoading && (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                            
                            {/* Load more button - fallback for when infinite scroll doesn't work */}
                            {!postsLoading && hasMorePosts && posts.length > 0 && (
                                <div className="flex justify-center py-4">
                                    <button
                                        onClick={loadMorePosts}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Load More Posts
                                    </button>
                                </div>
                            )}
                            
                            {/* End of posts indicator */}
                            {!hasMorePosts && posts.length > 0 && (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                    No more posts to show
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

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
                            src={selectedImage}
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

export default Profile