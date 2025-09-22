import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import User from "../models/User.js";
import BlacklistedToken from "../models/BlacklistedToken.js";

dotenv.config();

export default async function auth(req, res, next) {
  // Try to get token from Authorization header first, then from cookies
  let token = req.headers.authorization;
  
  if (!token && req.cookies.authToken) {
    token = `Bearer ${req.cookies.authToken}`;
  }
  
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }
  
  try {
    const actualToken = token.replace("Bearer ", "");
    const payload = jwt.verify(actualToken, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const tokenHash = crypto.createHash('sha256').update(actualToken).digest('hex');
    
    const blacklistedToken = await BlacklistedToken.findOne({
      where: { tokenHash }
    });
    
    if (blacklistedToken) {
      return res.status(401).json({ message: "Token has been invalidated" });
    }
    
    // Verify that the user still exists in the database
    const userId = payload.userId || payload.id; // Support both for backward compatibility
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found, please login again" });
    }
    
    // Check if user is banned and restrict API access (except for messaging and auth)
    if (user.isBanned) {
      const allowedPaths = [
        '/api/auth/logout',
        '/api/auth/me',
        '/api/users/me',
        '/api/chats',
        '/api/messages'
      ];
      
      const isAllowedPath = allowedPaths.some(path => req.path.startsWith(path));
      
      if (!isAllowedPath) {
        return res.status(403).json({ 
          message: "Access denied. Your account has been banned.",
          banned: true,
          banReason: user.banReason || "Violation of community guidelines"
        });
      }
    }
    
    req.userId = userId;
    req.user = user;
    req.token = actualToken; // Store token for potential blacklisting
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
