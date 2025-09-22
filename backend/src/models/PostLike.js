import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import User from "./User.js";
import Post from "./Post.js";

const PostLike = sequelize.define("PostLike", {
  userId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  postId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: Post,
      key: 'id'
    }
  },
  likeType: { 
    type: DataTypes.ENUM('like', 'dislike'), 
    allowNull: false 
  }
}, {
  timestamps: true,
  // Ensure one like per user per post
  indexes: [
    {
      unique: true,
      fields: ['userId', 'postId']
    }
  ]
});

// Relations
PostLike.belongsTo(User, { foreignKey: "userId", as: "user" });
PostLike.belongsTo(Post, { foreignKey: "postId", as: "post" });

// Add associations to existing models
User.hasMany(PostLike, { foreignKey: "userId" });
Post.hasMany(PostLike, { foreignKey: "postId", as: "likes" });

export default PostLike;
