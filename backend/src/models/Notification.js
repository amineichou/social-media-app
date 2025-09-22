import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Notification = sequelize.define("Notification", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('friend_request', 'friend_accepted', 'post_like', 'post_comment', 'comment_like', 'comment_reply', 'admin_notification', 'admin_broadcast'),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fromUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  relatedId: {
    type: DataTypes.INTEGER,
    allowNull: true // Could be friendshipId, postId, etc.
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

export default Notification;
