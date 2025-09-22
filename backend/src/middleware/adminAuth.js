import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import BlacklistedToken from '../models/BlacklistedToken.js';

const adminAuth = async (req, res, next) => {
  try {
    // First check regular authentication
    const token = req.cookies.authToken;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.userId;

    // Check if token is blacklisted
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const blacklistedToken = await BlacklistedToken.findOne({
      where: { tokenHash }
    });
    
    if (blacklistedToken) {
      return res.status(401).json({ message: 'Token has been invalidated' });
    }

    // Get user with admin status
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Account is banned.' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Update last active
    await user.update({ lastActive: new Date() });

    req.userId = userId;
    req.user = user;
    req.token = token; // Store token for potential blacklisting
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

export default adminAuth;
