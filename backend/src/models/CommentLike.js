import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const CommentLike = sequelize.define('CommentLike', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  commentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Comments',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  likeType: {
    type: DataTypes.ENUM('like'),
    allowNull: false,
    defaultValue: 'like'
  }
}, {
  timestamps: true,
  tableName: 'CommentLikes',
  indexes: [
    {
      unique: true,
      fields: ['commentId', 'userId']
    }
  ]
});

export default CommentLike;
