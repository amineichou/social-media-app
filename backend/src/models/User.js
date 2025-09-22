import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const User = sequelize.define("User", {
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  birthday: { type: DataTypes.DATEONLY, allowNull: false },
  gender: { type: DataTypes.ENUM('male', 'female'), allowNull: false },
  avatar: { type: DataTypes.STRING, allowNull: true, defaultValue: '/user-avatar.png' },
  bio: { type: DataTypes.TEXT, allowNull: true },
  location: { type: DataTypes.STRING, allowNull: true },
  theme: { type: DataTypes.ENUM('light', 'dark', 'auto'), defaultValue: 'light' },
  notifications: { type: DataTypes.ENUM('all', 'mentions', 'important', 'none'), defaultValue: 'all' },
  privacy: { type: DataTypes.ENUM('public', 'friends', 'private'), defaultValue: 'public' },
  emailNotifications: { type: DataTypes.BOOLEAN, defaultValue: true },
  profileVisibility: { type: DataTypes.ENUM('public', 'friends', 'private'), defaultValue: 'public' },
  showOnlineStatus: { type: DataTypes.BOOLEAN, defaultValue: true },
  allowDirectMessages: { type: DataTypes.BOOLEAN, defaultValue: true },
  showActivityStatus: { type: DataTypes.BOOLEAN, defaultValue: true },
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false },
  banReason: { type: DataTypes.TEXT, allowNull: true },
  lastActive: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  timestamps: true
});

export default User;