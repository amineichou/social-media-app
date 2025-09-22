import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaUser, FaEnvelope, FaLock, FaBirthdayCake, FaVenus, FaMars } from 'react-icons/fa';
import { validateForm, createValidatedInputHandler, sanitizeInput } from '../utils/validation.js';
import { setUserData } from '../utils/auth.js';

const ProfileEdit = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    currentPassword: '',
    password: '',
    birthday: '',
    gender: ''
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('/user-avatar.png');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Edit Profile - Jupiter";
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          username: userData.username || '',
          email: userData.email || '',
          currentPassword: '',
          password: '',
          birthday: userData.birthday ? userData.birthday.split('T')[0] : '',
          gender: userData.gender || ''
        });
        
        if (userData.avatar) {
          const avatarUrl = userData.avatar.startsWith('http') 
            ? userData.avatar 
            : `${userData.avatar}`;
          setAvatarPreview(avatarUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = createValidatedInputHandler(setFormData, setFieldErrors);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError('Avatar image must be less than 2MB');
        return;
      }
      
      setAvatar(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    setFieldErrors({});

    // Validate form data
    const fieldsToValidate = ['firstName', 'lastName', 'username', 'email'];
    if (formData.password) {
      fieldsToValidate.push('password');
    }

    const validation = validateForm(formData, fieldsToValidate);
    
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setSaving(false);
      return;
    }

    // Validate password change
    if (formData.password && !formData.currentPassword) {
      setError('Please enter your current password to change it');
      setSaving(false);
      return;
    }

    try {
      const submitData = new FormData();
      
      // Use sanitized data
      Object.keys(validation.sanitizedData).forEach(key => {
        if (validation.sanitizedData[key] && (key !== 'password' || validation.sanitizedData[key].trim() !== '')) {
          submitData.append(key, validation.sanitizedData[key]);
        }
      });
      
      // Add current password if provided
      if (formData.currentPassword) {
        submitData.append('currentPassword', formData.currentPassword);
      }
      
      if (avatar) {
        submitData.append('avatar', avatar);
      }

      const response = await fetch('/api/users/me', {
        method: 'PUT',
        credentials: 'include', // Use cookies instead of Authorization header
        body: submitData
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Profile updated successfully!');
        // Clear password fields after successful update
        setFormData(prev => ({ ...prev, currentPassword: '', password: '' }));
        
        // Navigate back to profile after a short delay
        setTimeout(() => {
          setUserData({
            username: validation.sanitizedData.username,
            firstName: validation.sanitizedData.firstName,
            lastName: validation.sanitizedData.lastName,
          });
          window.location.href = `/profile`;
        }, 1500);
      } else {
        setError(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Edit Profile</h1>
          
          {message && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
                <label className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full cursor-pointer transition-colors">
                  <FaCamera size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2">Click the camera icon to change your avatar</p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaUser className="inline mr-2" />
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your first name"
                  required
                />
                {fieldErrors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaUser className="inline mr-2" />
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your last name"
                  required
                />
                {fieldErrors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline mr-2" />
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  fieldErrors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your username"
                required
              />
              {fieldErrors.username && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline mr-2" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                required
              />
              {fieldErrors.email && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaLock className="inline mr-2" />
                Current Password (required to change password)
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaLock className="inline mr-2" />
                New Password (leave blank to keep current)
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  fieldErrors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter new password"
              />
              {fieldErrors.password && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Birthday and Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaBirthdayCake className="inline mr-2" />
                  Birthday
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">
                    <FaMars className="inline mr-2" />
                    Male
                  </option>
                  <option value="female">
                    <FaVenus className="inline mr-2" />
                    Female
                  </option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;
