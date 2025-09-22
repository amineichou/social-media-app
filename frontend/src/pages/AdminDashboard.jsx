import React, { useState, useEffect } from 'react';
import { 
  FaUsers, FaComments, FaHeart, FaUserShield, 
  FaBan, FaChartLine, FaSearch, FaBroadcastTower,
  FaTrashAlt, FaUserPlus, FaUserMinus, FaEye
} from 'react-icons/fa';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAlert } from '../components/Alert';
import { useConfirm } from '../components/ConfirmAlert';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({});
  const [userFilters, setUserFilters] = useState({
    search: '',
    status: 'all',
    page: 1,
    limit: 20
  });
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newNotification, setNewNotification] = useState({
    title: '',
    content: '',
    type: 'info'
  });
  const [postToDelete, setPostToDelete] = useState('');
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAnalytics();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, userFilters]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication required. Please log in as admin.');
          return;
        } else if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAnalytics(data);
      setError('');
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError(`Failed to fetch analytics: ${error.message}`);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(userFilters);
      const response = await fetch(`/api/admin/users?${queryParams}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication required. Please log in as admin.');
          return;
        } else if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
      setUsersPagination(data.pagination || {});
      setError('');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, banned, reason = '') => {
    let banReason = reason;
    
    // Prompt for ban reason if banning a user
    if (banned && !banReason) {
      banReason = prompt('Please provide a reason for banning this user:');
      if (banReason === null) return; // User cancelled
      if (!banReason.trim()) {
        setError('Ban reason is required');
        return;
      }
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ banned, reason: banReason })
      });
      
      if (response.ok) {
        fetchUsers(); // Refresh users list
        setError(''); // Clear any previous errors
        showAlert(`User ${banned ? 'banned' : 'unbanned'} successfully!`, 'success');
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Failed to ${banned ? 'ban' : 'unban'} user`);
      }
    } catch (error) {
      console.error('Failed to ban/unban user:', error);
      setError(`Network error: Failed to ${banned ? 'ban' : 'unban'} user. Please check your connection and try again.`);
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = await showConfirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone and will permanently remove all their data.',
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchUsers(); // Refresh users list
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      setError('Network error: Failed to delete user. Please check your connection and try again.');
    }
  };

  const handlePromoteUser = async (userId, isAdmin) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isAdmin })
      });
      
      if (response.ok) {
        fetchUsers(); // Refresh users list
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Failed to ${isAdmin ? 'promote' : 'demote'} user`);
      }
    } catch (error) {
      console.error('Failed to promote/demote user:', error);
      setError(`Network error: Failed to ${isAdmin ? 'promote' : 'demote'} user. Please check your connection and try again.`);
    }
  };

    const handleBroadcast = async () => {
    if (!newNotification.title || !newNotification.content) {
      setError('Please fill in all notification fields');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: newNotification.title,
        message: newNotification.content,
        type: newNotification.type,
        targetUsers: broadcastTarget
      };

      const response = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setNewNotification({ title: '', content: '', type: 'info' });
        setBroadcastTarget('all');
        setError('');
        showAlert(`Broadcast sent successfully to ${result.targetCount} users!`, 'success');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send broadcast');
      }
    } catch (error) {
      console.error('Failed to send broadcast:', error);
      setError('Failed to send broadcast. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete.trim()) {
      setError('Please enter a post ID');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Delete Post',
      message: `Are you sure you want to delete post ID ${postToDelete}? This action cannot be undone and will permanently remove the post and all its comments.`,
      confirmText: 'Delete Post',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/posts/${postToDelete}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setPostToDelete('');
        setError('');
        showAlert('Post deleted successfully!', 'success');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      setError('Failed to delete post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!analytics) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-500 mb-2">Loading analytics...</div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
          </div>
        </div>
      );
    }

    const { overview, charts } = analytics;

    // Safety check for charts data
    if (!charts) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-red-600">
            Analytics data is incomplete. Please refresh the page.
          </div>
        </div>
      );
    }

    // Prepare chart data
    const userGrowthData = {
      labels: charts.userGrowth?.map(item => item.date) || [],
      datasets: [{
        label: 'New Users',
        data: charts.userGrowth?.map(item => item.count) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      }]
    };

    const postActivityData = {
      labels: charts.postActivity?.map(item => item.date) || [],
      datasets: [{
        label: 'New Posts',
        data: charts.postActivity?.map(item => item.count) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)'
      }]
    };

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <FaUsers className="text-3xl text-blue-500 mr-4" />
              <div>
                <p className="text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{overview.totalUsers}</p>
                <p className="text-sm text-green-600">+{overview.newUsers} this period</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <FaComments className="text-3xl text-green-500 mr-4" />
              <div>
                <p className="text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold">{overview.totalPosts}</p>
                <p className="text-sm text-green-600">+{overview.newPosts} this period</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <FaHeart className="text-3xl text-red-500 mr-4" />
              <div>
                <p className="text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold">{overview.totalLikes}</p>
                <p className="text-sm text-gray-600">Posts & Comments</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <FaBan className="text-3xl text-orange-500 mr-4" />
              <div>
                <p className="text-gray-600">Banned Users</p>
                <p className="text-2xl font-bold">{overview.bannedUsers}</p>
                <p className="text-sm text-gray-600">Requires attention</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">User Growth</h3>
            <Line data={userGrowthData} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Post Activity</h3>
            <Bar data={postActivityData} />
          </div>
        </div>

        {/* Top Users */}
        {analytics.leaderboards?.mostActiveUsers && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Most Active Users</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Posts</th>
                    <th className="text-left py-2">Comments</th>
                    <th className="text-left py-2">Total Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.leaderboards.mostActiveUsers.map((user, index) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-2">
                        <div className="flex items-center">
                          <img
                            src={user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${user.avatar}`) : '/user-avatar.png'}
                            alt={user.username}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                          {user.firstName} {user.lastName} (@{user.username})
                        </div>
                      </td>
                      <td className="py-2">{user.postCount}</td>
                      <td className="py-2">{user.commentCount}</td>
                      <td className="py-2 font-semibold">{user.postCount + user.commentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUsers = () => {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
                  value={userFilters.search}
                  onChange={(e) => setUserFilters({...userFilters, search: e.target.value, page: 1})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={userFilters.status}
                onChange={(e) => setUserFilters({...userFilters, status: e.target.value, page: 1})}
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={userFilters.limit}
                onChange={(e) => setUserFilters({...userFilters, limit: parseInt(e.target.value), page: 1})}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="text-gray-500 mb-2">Loading users...</div>
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <div className="text-red-600">{error}</div>
            </div>
          ) : !users || users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${user.avatar}`) : '/user-avatar.png'}
                              alt={user.username}
                              className="w-10 h-10 rounded-full mr-3"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                              <div className="text-xs text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{user.postCount} posts</div>
                          <div>{user.commentCount} comments</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            {user.isAdmin && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <FaUserShield className="mr-1" /> Admin
                              </span>
                            )}
                            {user.isBanned ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <FaBan className="mr-1" /> Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {!user.isAdmin && (
                              <>
                                <button
                                  onClick={() => handleBanUser(user.id, !user.isBanned)}
                                  className={`p-2 rounded ${
                                    user.isBanned 
                                      ? 'text-green-600 hover:bg-green-50' 
                                      : 'text-red-600 hover:bg-red-50'
                                  }`}
                                  title={user.isBanned ? 'Unban user' : 'Ban user'}
                                >
                                  {user.isBanned ? <FaUserPlus /> : <FaBan />}
                                </button>
                                <button
                                  onClick={() => handlePromoteUser(user.id, !user.isAdmin)}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                                  title="Promote to admin"
                                >
                                  <FaUserShield />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete user"
                                >
                                  <FaTrashAlt />
                                </button>
                              </>
                            )}
                            {user.isAdmin && !user.isBanned && (
                              <button
                                onClick={() => handlePromoteUser(user.id, false)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                                title="Remove admin"
                              >
                                <FaUserMinus />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersPagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setUserFilters({...userFilters, page: userFilters.page - 1})}
                      disabled={userFilters.page <= 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setUserFilters({...userFilters, page: userFilters.page + 1})}
                      disabled={userFilters.page >= usersPagination.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">{(userFilters.page - 1) * userFilters.limit + 1}</span>
                        {' '}to{' '}
                        <span className="font-medium">
                          {Math.min(userFilters.page * userFilters.limit, usersPagination.total)}
                        </span>
                        {' '}of{' '}
                        <span className="font-medium">{usersPagination.total}</span>
                        {' '}results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setUserFilters({...userFilters, page: userFilters.page - 1})}
                          disabled={userFilters.page <= 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setUserFilters({...userFilters, page: userFilters.page + 1})}
                          disabled={userFilters.page >= usersPagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaBroadcastTower className="mr-2" />
            Broadcast Notification
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                placeholder="Notification title..."
                value={newNotification.title}
                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                className="border border-gray-300 rounded-md px-3 py-2 w-full h-32"
                placeholder="Enter your notification message..."
                value={newNotification.content}
                onChange={(e) => setNewNotification({...newNotification, content: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={newNotification.type}
                onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
              >
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
              >
                <option value="all">All Users</option>
                <option value="admins">Admin Users Only</option>
              </select>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <button
              onClick={handleBroadcast}
              disabled={!newNotification.title.trim() || !newNotification.content.trim() || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPosts = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaTrashAlt className="mr-2" />
            Delete Post by ID
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Post ID</label>
              <input
                type="number"
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                placeholder="Enter post ID to delete..."
                value={postToDelete}
                onChange={(e) => setPostToDelete(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the numeric ID of the post you want to delete. This action cannot be undone.
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <button
              onClick={handleDeletePost}
              disabled={!postToDelete.trim() || loading}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <FaTrashAlt className="mr-2" />
              {loading ? 'Deleting...' : 'Delete Post'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <FaUserShield className="text-3xl text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaChartLine className="inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaUsers className="inline mr-2" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaBroadcastTower className="inline mr-2" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'posts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaTrashAlt className="inline mr-2" />
              Post Management
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'posts' && renderPosts()}
      </div>
    </div>
  );
};

export default AdminDashboard;
