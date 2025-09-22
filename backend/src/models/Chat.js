import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Chat = sequelize.define("Chat", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  participants: {
    type: DataTypes.JSON, // Array of user IDs participating in the chat
    allowNull: false,
  },
  isGroupChat: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  groupName: {
    type: DataTypes.STRING,
    allowNull: true, // Only for group chats
  },
  lastMessageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

export default Chat;
