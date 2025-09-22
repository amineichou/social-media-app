import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import User from "./User.js";

const Post = sequelize.define("Post", {
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
  authorId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  timestamps: true
});

// relation: Post.authorId -> User.id
Post.belongsTo(User, { as: "author", foreignKey: "authorId" });
User.hasMany(Post, { foreignKey: "authorId" });

export default Post;
