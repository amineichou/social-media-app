import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import multer from "multer";
import { Op } from "sequelize";
import User from "../models/User.js";
import BlacklistedToken from "../models/BlacklistedToken.js";
import dotenv from "dotenv";
import { validateRequestBody } from "../utils/validation.js";

dotenv.config();
const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to calculate age
function calculateAge(birthday) {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

router.post("/register", (req, res, next) => {
  // Use multer only if there are files
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.single("avatar")(req, res, next);
  } else {
    next();
  }
}, validateRequestBody(['firstName', 'lastName', 'username', 'email', 'password']), async function (req, res) {
  try {
    let { firstName, lastName, username, email, password, birthday, gender } = req.body;
    
    // Handle arrays (take first value if array)
    firstName = Array.isArray(firstName) ? firstName[0] : firstName;
    lastName = Array.isArray(lastName) ? lastName[0] : lastName;
    username = Array.isArray(username) ? username[0] : username;
    email = Array.isArray(email) ? email[0] : email;
    password = Array.isArray(password) ? password[0] : password;
    birthday = Array.isArray(birthday) ? birthday[0] : birthday;
    gender = Array.isArray(gender) ? gender[0] : gender;
    
    // Debug logging
    console.log("Received registration data:", {
      firstName, lastName, username, email, 
      birthday, gender,
      genderType: typeof gender,
      genderValue: JSON.stringify(gender)
    });
    
    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password || !birthday || !gender) {
      return res.status(400).json({ 
        message: "All fields are required: firstName, lastName, username, email, password, birthday, gender" 
      });
    }
    // console.log("Registering user:", gender);
    // Validate gender - trim whitespace and ensure it's a string
    const trimmedGender = typeof gender === 'string' ? gender.trim().toLowerCase() : String(gender).trim().toLowerCase();
    if (!['male', 'female'].includes(trimmedGender)) {
      console.log("Gender validation failed:", { original: gender, trimmed: trimmedGender });
      return res.status(400).json({ message: "Gender must be either 'male' or 'female'" });
    }
    
    // Validate age (must be 18+)
    const age = calculateAge(birthday);
    if (age < 18) {
      return res.status(400).json({ 
        message: "You must be at least 18 years old to register" 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }
    
    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Handle avatar upload
    const avatarPath = req.file ? `/uploads/${req.file.filename}` : '/user-avatar.png';
    
    const user = await User.create({ 
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(), 
      email: email.trim().toLowerCase(), 
      passwordHash, 
      birthday,
      gender: trimmedGender,
      avatar: avatarPath
    });
    
    return res.json({ 
      message: "Registration successful! Welcome to Jupiter.",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(400).json({ message: "Registration failed", error: err.message });
  }
});

router.post("/login", async function (req, res) {
  try {
    const { username, password } = req.body;
    
    // Search for user by either username or email
    const user = await User.findOne({ 
      where: {
        [Op.or]: [
          { username: username },
          { email: username.toLowerCase() }
        ]
      }
    });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    // Set httpOnly cookie for the token (more secure)
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false, // Set to false for development (localhost)
      sameSite: 'lax', // Less restrictive for development
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
    
    return res.json({ 
      success: true,
      message: "Login successful",
      username: user.username, 
      firstName: user.firstName, 
      lastName: user.lastName,
      userId: user.id 
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login error", error: err.message });
  }
});

// Logout endpoint to clear httpOnly cookie
router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    
    if (token) {
      // Blacklist the token
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      console.log('🔍 Logout: Creating hash for token:', tokenHash);
      
      // Decode token to get expiration date
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const expiresAt = new Date(decoded.exp * 1000);
        console.log('✅ Token decoded, expires at:', expiresAt);
        
        // Add to blacklist
        const blacklistEntry = await BlacklistedToken.create({
          tokenHash,
          userId: decoded.userId || decoded.id,
          expiresAt
        });
        console.log('✅ Token blacklisted successfully:', blacklistEntry.id);
      } catch (jwtError) {
        // Token might be invalid/expired, but still clear the cookie
        console.log('❌ Token validation error during logout:', jwtError.message);
      }
    }
    
    // Clear the cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: false, // Match the login cookie settings
      sameSite: 'lax',
      path: '/'
    });
    
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear the cookie even if blacklisting fails
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
    });
    res.json({ message: "Logged out successfully" });
  }
});

// Verify authentication endpoint
router.get("/verify", async (req, res) => {
  try {
    const token = req.cookies.authToken;
    
    if (!token) {
      return res.status(401).json({ authenticated: false });
    }
    
    // Check if token is blacklisted
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const blacklistedToken = await BlacklistedToken.findOne({
      where: { tokenHash }
    });
    
    if (blacklistedToken) {
      return res.status(401).json({ authenticated: false, message: "Token has been invalidated" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id; // Support both for backward compatibility
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }
    
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        email: user.email
      }
    });
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
