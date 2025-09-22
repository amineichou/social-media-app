import React, { useState, useEffect } from 'react';
import { FaUser, FaBell, FaShieldAlt, FaTrash, FaPalette, FaSave, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getUserId, setThemeCookie } from '../utils/auth';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../components/Alert';

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { showAlert } = useAlert();
  
  const [settings, setSettings] = useState({
    notifications: 'all',
    privacy: 'public',
    emailNotifications: true,
    profileVisibility: 'public',
    showOnlineStatus: true,
    allowDirectMessages: true,
    showActivityStatus: true
  });

  // Fetch current user settings and info
  useEffect(() => {
    document.title = "Settings - Jupiter";
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        // Set settings from user preferences
        setSettings({
          notifications: userData.notifications || 'all',
          privacy: userData.privacy || 'public',
          emailNotifications: userData.emailNotifications !== false,
          profileVisibility: userData.profileVisibility || 'public',
          showOnlineStatus: userData.showOnlineStatus !== false,
          allowDirectMessages: userData.allowDirectMessages !== false,
          showActivityStatus: userData.showActivityStatus !== false
        });
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'theme') {
      setTheme(value);
      setThemeCookie(value);
      location.reload();
    } else {
      setSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSuccessMessage('');
    
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...settings,
          theme
        })
      });

      if (response.ok) {
        setSuccessMessage('Settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        showAlert(`Failed to save settings: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showAlert('Failed to save settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!deletePassword.trim()) {
      showAlert('Please enter your password to confirm account deletion.', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/users/delete-account', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: deletePassword
        })
      });

      if (response.ok) {
        showAlert('Your account has been successfully deleted.', 'success');
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login');
      } else {
        const errorData = await response.json();
        showAlert(`Failed to delete account: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      showAlert('Failed to delete account. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your account preferences and privacy settings</p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <FaSave className="text-green-500 mr-2" />
              <span className="text-green-800 dark:text-green-200">{successMessage}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2">
            {/* Appearance */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <FaPalette className="text-purple-500 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                </div>
              </div>
              <div className="p-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => handleInputChange('theme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose how the interface looks</p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <FaBell className="text-yellow-500 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Push Notifications</label>
                  <select
                    value={settings.notifications}
                    onChange={(e) => handleInputChange('notifications', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All notifications</option>
                    <option value="mentions">Mentions and replies only</option>
                    <option value="important">Important only</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Email notifications
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Privacy */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <FaShieldAlt className="text-green-500 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Visibility</label>
                  <select
                    value={settings.profileVisibility}
                    onChange={(e) => handleInputChange('profileVisibility', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showOnlineStatus"
                      checked={settings.showOnlineStatus}
                      onChange={(e) => handleInputChange('showOnlineStatus', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="showOnlineStatus" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Show online status
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowDirectMessages"
                      checked={settings.allowDirectMessages}
                      onChange={(e) => handleInputChange('allowDirectMessages', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="allowDirectMessages" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Allow direct messages
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showActivityStatus"
                      checked={settings.showActivityStatus}
                      onChange={(e) => handleInputChange('showActivityStatus', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="showActivityStatus" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Show activity status
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-6 transition-colors"
            >
              <FaSave className="mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2 flex items-center">
                <FaTrash className="mr-2" />
                Danger Zone
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Delete Account</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                This action cannot be undone. This will permanently delete your account and all associated data.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your password to confirm:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <FaEyeSlash className="text-gray-400 dark:text-gray-500" /> : <FaEye className="text-gray-400 dark:text-gray-500" />}
                  </button>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                    setShowPassword(false);
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
