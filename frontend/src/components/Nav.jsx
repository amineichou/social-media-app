import { Link, useLocation } from "react-router-dom"
import { getUsername, clearAuth, getUserId, getFirstName, getLastName } from "../utils/auth.js";
import { FaSignOutAlt, FaUserEdit, FaCircle, FaHome, FaPlus, FaUser, FaEnvelope, FaUserShield } from "react-icons/fa";
import { IoChatbubbles, IoNotifications, IoPerson } from "react-icons/io5";
import { useState, useEffect } from "react";
import { useSocket } from "../contexts/SocketContext.jsx";
import { IoSettings } from "react-icons/io5";
import { GoHomeFill } from "react-icons/go";
import Logo from "./Logo.jsx";

const Nav = () => {
    const socketContext = useSocket();
    const isConnected = socketContext?.isConnected || false;
    const unreadMessages = socketContext?.unreadMessages || 0;
    const notifications = socketContext?.notifications || [];
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [userAvatar, setUserAvatar] = useState('/user-avatar.png');
    const [isAdmin, setIsAdmin] = useState(false);
    const location = useLocation();

    const username = getUsername();
    const firstname = getFirstName();
    const lastname = getLastName();
    const userId = getUserId();
    const logged = !!userId; // Check if logged in by presence of userId

    // Debug socket context
    useEffect(() => {
        if (logged) {
            console.log('🔍 Nav: Socket Context Debug:', {
                socketContext: !!socketContext,
                isConnected,
                notificationsCount: notifications.length,
                unreadMessages,
                socket: !!socketContext?.socket
            });
        }
    }, [logged, socketContext, isConnected, notifications.length, unreadMessages]);

    // Fetch user avatar and admin status when component mounts
    useEffect(() => {
        if (logged) {
            fetch('/api/users/me', {
                credentials: 'include' // Use cookies instead of Authorization header
            })
                .then(response => {
                    return response.json();
                })
                .then(data => {
                    if (data.avatar) {
                        // Handle both absolute and relative avatar paths
                        const avatarUrl = data.avatar.startsWith('http')
                            ? data.avatar
                            : `${data.avatar}`;
                        setUserAvatar(avatarUrl);
                    }
                    setIsAdmin(data.isAdmin || false);
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                });
        }
    }, [logged]);

    async function logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include' // Include cookies
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        clearAuth();
        window.location.href = "/";
    }

    const isActive = (path) => location.pathname === path;
    const unreadNotifications = notifications.filter(n => !n.isRead).length;

    if (!logged) {
        // Show top navigation for non-logged-in users
        return (
            <nav className="fixed z-10 w-full h-20 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-10">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/logo.png" alt="Jupiter" className="h-10 w-auto" />
                </Link>
                <div className="flex items-center gap-4">
                    <Link
                        to="/login"
                        className="px-5 py-2 rounded-lg text-blue-700 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        to="/register"
                        className="px-5 py-2 rounded-lg bg-blue-700 dark:bg-blue-600 text-white font-bold hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors shadow"
                    >
                        Sign Up
                    </Link>
                </div>
            </nav>
        );
    }

    return (
        <>
            {/* Desktop Sidebar - Hidden on mobile */}
            <div className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30 flex-col transition-all duration-300">
                {/* Logo */}
                <Logo />

                {/* Navigation Items */}
                <nav className="flex-1 py-6">
                    <div className="space-y-2 px-4">
                        {/* Home */}
                        <Link
                            to="/"
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/')
                                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            title="Home"
                        >
                            <GoHomeFill size={20} className="shrink-0" />
                            <span className="text-lg">Home</span>
                        </Link>

                        {/* Messages */}
                        <Link
                            to="/inbox"
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 relative ${isActive('/inbox') || location.pathname.startsWith('/inbox/')
                                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            title="Messages"
                        >
                            <IoChatbubbles size={20} className="shrink-0" />
                            <span className="text-lg">Messages</span>
                            {unreadMessages > 0 && (
                                <span className="absolute right-3 top-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                    {unreadMessages > 9 ? '9+' : unreadMessages}
                                </span>
                            )}
                        </Link>

                        {/* Notifications */}
                        <Link
                            to="/notifications"
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 relative ${isActive('/notifications')
                                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            title="Notifications"
                        >
                            <IoNotifications size={20} className="shrink-0" />
                            <span className="text-lg">Notifications</span>
                            {unreadNotifications > 0 && (
                                <span className="absolute right-3 top-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                </span>
                            )}
                        </Link>

                        {/* Create Post */}
                        <Link
                            to="/new"
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/new')
                                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            title="Create"
                        >
                            <FaPlus size={20} className="shrink-0" />
                            <span className="text-lg">Create</span>
                        </Link>

                        {/* Profile */}
                        <Link
                            to="/profile"
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/profile') || location.pathname.startsWith('/profile/')
                                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            title="Profile"
                        >
                            <IoPerson size={20} className="shrink-0" />
                            <span className="text-lg">Profile</span>
                        </Link>

                        {/* Admin Dashboard - Only show for admin users */}
                        {isAdmin && (
                            <Link
                                to="/admin"
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/admin')
                                        ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                    }`}
                                title="Admin Dashboard"
                            >
                                <FaUserShield size={20} className="shrink-0" />
                                <span className="text-lg">Admin</span>
                            </Link>
                        )}
                    </div>
                </nav>

                {/* User Info & Status */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {/* Connection Status */}
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <FaCircle
                            className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}
                        />
                        <span className={`text-sm font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isConnected ? 'Connected' : 'Offline'}
                        </span>
                    </div>

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            onBlur={() => setTimeout(() => setShowUserMenu(false), 150)}
                            className="w-full flex items-center justify-start gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            title={`${username} - Click for options`}
                        >
                            <img
                                src={userAvatar}
                                alt="User Avatar"
                                className="h-10 w-10 rounded-full object-cover shrink-0"
                            />
                            <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900 dark:text-white truncate">{firstname} {lastname}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">@{username}</div>
                            </div>
                        </button>

                        {/* User Dropdown Menu */}
                        {showUserMenu && (
                            <div
                                className="absolute bottom-full mb-2 left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                <Link
                                    to="/edit-profile"
                                    className="flex items-center justify-start gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-xl transition-colors"
                                    onClick={() => setShowUserMenu(false)}
                                    title="Edit Profile"
                                >
                                    <FaUserEdit size={16} className="shrink-0" />
                                    <span>Edit Profile</span>
                                </Link>
                                <Link
                                    to="/settings"
                                    className="flex items-center justify-start gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => setShowUserMenu(false)}
                                    title="Settings"
                                >
                                    <IoSettings size={16} className="shrink-0" />
                                    <span>Settings</span>
                                </Link>
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        logout();
                                    }}
                                    className="w-full flex items-center justify-start gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-xl transition-colors"
                                    title="Logout"
                                >
                                    <FaSignOutAlt size={16} className="shrink-0" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30 lg:hidden">
                <div className="flex items-center justify-around py-2">
                    <Link
                        to="/"
                        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        <FaHome size={24} />
                    </Link>
                    <Link
                        to="/inbox"
                        className={`flex flex-col items-center p-2 rounded-lg transition-colors relative ${isActive('/inbox') || location.pathname.startsWith('/inbox/') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        <FaEnvelope size={24} />
                        {unreadMessages > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                        )}
                    </Link>
                    <Link
                        to="/new"
                        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/new') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        <FaPlus size={24} />
                    </Link>
                    <Link
                        to="/notifications"
                        className={`flex flex-col items-center p-2 rounded-lg transition-colors relative ${isActive('/notifications') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        <IoNotifications size={24} />
                        {unreadNotifications > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                {unreadNotifications > 9 ? '9+' : unreadNotifications}
                            </span>
                        )}
                    </Link>
                    <Link
                        to="/profile"
                        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/profile') || location.pathname.startsWith('/profile/') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        <img
                            src={userAvatar}
                            alt="Profile"
                            className="h-6 w-6 rounded-full object-cover"
                        />
                    </Link>
                </div>
            </div>
        </>
    );
}

export default Nav;
