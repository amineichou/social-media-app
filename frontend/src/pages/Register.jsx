import { useState } from "react";
import { Link } from "react-router-dom";
import { validateForm, createValidatedInputHandler } from "../utils/validation.js";
import { useAlert } from "../components/Alert";

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    birthday: "",
    gender: ""
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const { showAlert } = useAlert();

  const handleInputChange = createValidatedInputHandler(setFormData, setFieldErrors);

  // Calculate age from birthday
  function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  // Handle avatar file selection
  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (file) {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        setError("Profile image must be less than 2MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError("Please select a valid image file");
        return;
      }

      setAvatar(file);
      setError("");

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    // Validate form data
    const fieldsToValidate = ['firstName', 'lastName', 'username', 'email', 'password'];
    const validation = validateForm(formData, fieldsToValidate);

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setLoading(false);
      return;
    }

    // Validate age
    if (formData.birthday) {
      const age = calculateAge(formData.birthday);
      if (age < 18) {
        setError("You must be at least 18 years old to register");
        setLoading(false);
        return;
      }
    }

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.email || !formData.password || !formData.birthday || !formData.gender) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      const submitData = new FormData();

      // Add all form fields directly (birthday and gender don't need sanitization)
      submitData.append('firstName', validation.sanitizedData.firstName || formData.firstName);
      submitData.append('lastName', validation.sanitizedData.lastName || formData.lastName);
      submitData.append('username', validation.sanitizedData.username || formData.username);
      submitData.append('email', validation.sanitizedData.email || formData.email);
      submitData.append('password', validation.sanitizedData.password || formData.password);
      submitData.append('birthday', formData.birthday);
      submitData.append('gender', formData.gender);

      if (avatar) {
        submitData.append('avatar', avatar);
      }

      const resp = await fetch("/api/auth/register", {
        method: "POST",
        body: submitData
      });

      const data = await resp.json();

      if (resp.ok) {
        showAlert(data.message || "Registration successful!", 'success');
        // Redirect to login or auto-login
        window.location.href = "/login";
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center p-4">

      <form className="md:w-96 w-80 flex flex-col items-center justify-center" onSubmit={submit}>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Profile Image Upload */}
        {/* <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
            </div>
            <label htmlFor="avatar" className="absolute bottom-0 right-0 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 cursor-pointer transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </label>
            <input
              type="file"
              id="avatar"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Optional profile photo (max 2MB)</p>
        </div> */}

        {/* First Name */}
        <div className="w-full mb-4">
          <div className={`flex items-center w-full bg-transparent border h-12 rounded-full overflow-hidden pl-6 gap-2 ${fieldErrors.firstName ? 'border-red-500' : 'border-gray-300/60'
            }`}>
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full"
              required
              value={formData.firstName}
              onChange={handleInputChange}
            />
          </div>
          {fieldErrors.firstName && (
            <p className="text-red-500 text-xs mt-1 ml-6">{fieldErrors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="w-full mb-4">
          <div className={`flex items-center w-full bg-transparent border h-12 rounded-full overflow-hidden pl-6 gap-2 ${fieldErrors.lastName ? 'border-red-500' : 'border-gray-300/60'
            }`}>
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full"
              required
              value={formData.lastName}
              onChange={handleInputChange}
            />
          </div>
          {fieldErrors.lastName && (
            <p className="text-red-500 text-xs mt-1 ml-6">{fieldErrors.lastName}</p>
          )}
        </div>

        {/* Email */}
        <div className="w-full mb-4">
          <div className={`flex items-center w-full bg-transparent border h-12 rounded-full overflow-hidden pl-6 gap-2 ${fieldErrors.email ? 'border-red-500' : 'border-gray-300/60'
            }`}>
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M0 .55.571 0H15.43l.57.55v9.9l-.571.55H.57L0 10.45zm1.143 1.138V9.9h13.714V1.69l-6.503 4.8h-.697zM13.749 1.1H2.25L8 5.356z" fill="#6B7280" />
            </svg>
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full"
              required
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1 ml-6">{fieldErrors.email}</p>
          )}
        </div>

        {/* Username */}
        <div className="w-full mb-4">
          <div className={`flex items-center w-full bg-transparent border h-12 rounded-full overflow-hidden pl-6 gap-2 ${fieldErrors.username ? 'border-red-500' : 'border-gray-300/60'
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-at" viewBox="0 0 16 16">
              <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914" />
            </svg>
            <input
              type="text"
              name="username"
              placeholder="Username"
              className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full"
              required
              value={formData.username}
              onChange={handleInputChange}
            />
          </div>
          {fieldErrors.username && (
            <p className="text-red-500 text-xs mt-1 ml-6">{fieldErrors.username}</p>
          )}
        </div>

        {/* Password */}
        <div className="w-full mb-4">
          <div className={`flex items-center w-full bg-transparent border h-12 rounded-full overflow-hidden pl-6 gap-2 ${fieldErrors.password ? 'border-red-500' : 'border-gray-300/60'
            }`}>
            <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 8.5c0-.938-.729-1.7-1.625-1.7h-.812V4.25C10.563 1.907 8.74 0 6.5 0S2.438 1.907 2.438 4.25V6.8h-.813C.729 6.8 0 7.562 0 8.5v6.8c0 .938.729 1.7 1.625 1.7h9.75c.896 0 1.625-.762 1.625-1.7zM4.063 4.25c0-1.406 1.093-2.55 2.437-2.55s2.438 1.144 2.438 2.55V6.8H4.061z" fill="#6B7280" />
            </svg>
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full"
              required
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>
          {fieldErrors.password && (
            <p className="text-red-500 text-xs mt-1 ml-6">{fieldErrors.password}</p>
          )}
        </div>

        {/* Birthday */}
        <div className="flex items-center w-full bg-transparent border border-gray-300/60 h-12 rounded-full overflow-hidden pl-6 gap-2 mb-4">
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
          </svg>
          <input
            type="date"
            name="birthday"
            placeholder="Birthday"
            className="bg-transparent text-gray-500/80 placeholder-gray-500/80 outline-none text-sm w-full h-full"
            required
            value={formData.birthday}
            onChange={handleInputChange}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
          />
        </div>

        {/* Gender */}
        <div className="w-full mb-6">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={formData.gender === 'male'}
                onChange={handleInputChange}
                className="mr-2 text-indigo-500"
                required
              />
              <span className="text-gray-700">Male</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={formData.gender === 'female'}
                onChange={handleInputChange}
                className="mr-2 text-indigo-500"
                required
              />
              <span className="text-gray-700">Female</span>
            </label>
          </div>
        </div>


        <div className="w-full flex items-center justify-between mt-4 text-gray-500/80">
          <div className="flex items-center gap-2">
            <input className="h-5" type="checkbox" id="terms" required />
            <label className="text-sm" htmlFor="terms">I agree to
              <Link to="/terms" className="underline">Terms & Conditions</Link>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full h-11 rounded-full text-white bg-indigo-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
